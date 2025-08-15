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
  onFinalSubmit, // kommt aus Dashboard -> handleFinalOnboardingSubmit
}) {
  const onboardingSteps = [
    { id: 1, title: 'Kundendaten', icon: Building, description: 'Firmendaten und Kontakt' },
    { id: 2, title: 'IT-Infrastruktur', icon: Network, description: 'Technische Dokumentation' },
    { id: 3, title: 'Bestätigung', icon: CheckCircle, description: 'Daten prüfen und speichern' },
  ];

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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Firmendaten</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Firmenname *</label>
            <input
              type="text"
              required
              value={onboardingCustomerData.firmenname}
              onChange={(e) =>
                setOnboardingCustomerData({ ...onboardingCustomerData, firmenname: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Firmenname"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail *</label>
            <input
              type="email"
              required
              value={onboardingCustomerData.email}
              onChange={(e) =>
                setOnboardingCustomerData({ ...onboardingCustomerData, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="firma@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Straße *</label>
            <input
              type="text"
              value={onboardingCustomerData.strasse}
              onChange={(e) =>
                setOnboardingCustomerData({ ...onboardingCustomerData, strasse: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Musterstraße"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hausnummer *</label>
            <input
              type="text"
              value={onboardingCustomerData.hausnummer}
              onChange={(e) =>
                setOnboardingCustomerData({ ...onboardingCustomerData, hausnummer: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123a"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PLZ *</label>
            <input
              type="text"
              value={onboardingCustomerData.plz}
              onChange={(e) =>
                setOnboardingCustomerData({ ...onboardingCustomerData, plz: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ort *</label>
            <input
              type="text"
              value={onboardingCustomerData.ort}
              onChange={(e) =>
                setOnboardingCustomerData({ ...onboardingCustomerData, ort: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Musterstadt"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefon *</label>
            <input
              type="tel"
              value={onboardingCustomerData.telefonnummer}
              onChange={(e) =>
                setOnboardingCustomerData({
                  ...onboardingCustomerData,
                  telefonnummer: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+49 123 456789"
            />
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Ansprechpartner</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vorname</label>
              <input
                type="text"
                value={onboardingCustomerData.ansprechpartner.vorname}
                onChange={(e) =>
                  setOnboardingCustomerData({
                    ...onboardingCustomerData,
                    ansprechpartner: {
                      ...onboardingCustomerData.ansprechpartner,
                      vorname: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Max"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nachname</label>
              <input
                type="text"
                value={onboardingCustomerData.ansprechpartner.name}
                onChange={(e) =>
                  setOnboardingCustomerData({
                    ...onboardingCustomerData,
                    ansprechpartner: {
                      ...onboardingCustomerData.ansprechpartner,
                      name: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mustermann"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
              <input
                type="text"
                value={onboardingCustomerData.ansprechpartner.position}
                onChange={(e) =>
                  setOnboardingCustomerData({
                    ...onboardingCustomerData,
                    ansprechpartner: {
                      ...onboardingCustomerData.ansprechpartner,
                      position: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="IT-Leiter"
              />
            </div>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Shield className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Internet & Firewall</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Internetzugang</label>
            <input
              type="text"
              value={infrastructureData.internet.zugang}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  internet: { ...infrastructureData.internet, zugang: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. DSL 100/40 Mbit, Glasfaser..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Firewall Modell</label>
            <input
              type="text"
              value={infrastructureData.internet.firewall_modell}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  internet: { ...infrastructureData.internet, firewall_modell: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Sophos XG 125"
            />
          </div>

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
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="feste_ip" className="ml-2 text-sm text-gray-700">
                Feste IP-Adresse vorhanden
              </label>
            </div>

            {infrastructureData.internet.feste_ip && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">IP-Adresse</label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="vpn_erforderlich" className="ml-2 text-sm text-gray-700">
              VPN-Einwahl erforderlich
            </label>
          </div>
        </div>
      </div>

      {/* Benutzer */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <User className="w-5 h-5 text-green-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Benutzer</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Anzahl User im Netz</label>
            <input
              type="number"
              value={infrastructureData.users.netz_user_anzahl}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  users: {
                    ...infrastructureData.users,
                    netz_user_anzahl: parseInt(e.target.value) || 0,
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Anzahl Mail-User</label>
            <input
              type="number"
              value={infrastructureData.users.mail_user_anzahl}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  users: {
                    ...infrastructureData.users,
                    mail_user_anzahl: parseInt(e.target.value) || 0,
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Hardware (Kurzfassung inkl. Liste + manuelle Eingabe) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Server className="w-5 h-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Hardware</h3>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hardware hinzufügen</label>

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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {infrastructureData.hardware.verwendete_hardware?.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Erfasste Hardware:</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {infrastructureData.hardware.verwendete_hardware.map((hw, index) => (
                    <div
                      key={`${hw}-${index}`}
                      className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
                    >
                      <span className="text-sm text-gray-700">{hw}</span>
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
                        className="text-red-600 hover:text-red-800 text-sm px-2"
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Mail className="w-5 h-5 text-orange-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Mail Server</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mail Speicherort</label>
            <input
              type="text"
              value={infrastructureData.mail.mail_speicherort}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  mail: { ...infrastructureData.mail, mail_speicherort: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Exchange, Office 365"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mail Server Volumen</label>
            <input
              type="text"
              value={infrastructureData.mail.mail_server_volumen}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  mail: { ...infrastructureData.mail, mail_server_volumen: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. 100 GB"
            />
          </div>
        </div>
      </div>

      {/* Software */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Settings className="w-5 h-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Software</h3>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Virenschutz</label>
            <input
              type="text"
              value={infrastructureData.software.virenschutz}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  software: { ...infrastructureData.software, virenschutz: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Sophos, Kaspersky"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="5"
              placeholder={`z.B.\nMicrosoft Office\nAdobe Creative Cloud\nSage 50`}
            />
          </div>
        </div>
      </div>

      {/* Backup */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <HardDrive className="w-5 h-5 text-red-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Backup</h3>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Backup-Strategie</label>
            <textarea
              value={infrastructureData.backup.strategie}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  backup: { ...infrastructureData.backup, strategie: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">NAS vorhanden</span>
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
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Dokumentation vorhanden</span>
            </label>
          </div>
        </div>
      </div>

      {/* Sonstiges */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Settings className="w-5 h-5 text-yellow-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Sonstiges</h3>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Zusammenfassung</h3>

          {/* Kunde */}
          <div className="space-y-2 mb-6">
            <h4 className="font-semibold text-gray-800">Kunde</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <dt className="text-sm text-gray-500">Firmenname</dt>
                <dd className="text-sm text-gray-900">{dash(firmenname)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">E-Mail</dt>
                <dd className="text-sm text-gray-900">{dash(email)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Straße / Nr.</dt>
                <dd className="text-sm text-gray-900">
                  {dash(strasse)} {dash(hausnummer)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">PLZ / Ort</dt>
                <dd className="text-sm text-gray-900">
                  {dash(plz)} {dash(ort)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Telefon</dt>
                <dd className="text-sm text-gray-900">{dash(telefonnummer)}</dd>
              </div>
            </dl>

            <h5 className="font-medium text-gray-700 mt-4">Ansprechpartner</h5>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
              <div>
                <dt className="text-sm text-gray-500">Vorname</dt>
                <dd className="text-sm text-gray-900">{dash(ansprechpartner?.vorname)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Nachname</dt>
                <dd className="text-sm text-gray-900">{dash(ansprechpartner?.name)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Position</dt>
                <dd className="text-sm text-gray-900">{dash(ansprechpartner?.position)}</dd>
              </div>
            </dl>
          </div>

          {/* Internet & Firewall */}
          <div className="space-y-2 mb-6">
            <h4 className="font-semibold text-gray-800">Internet &amp; Firewall</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <dt className="text-sm text-gray-500">Internetzugang</dt>
                <dd className="text-sm text-gray-900">{dash(internet?.zugang)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Firewall-Modell</dt>
                <dd className="text-sm text-gray-900">{dash(internet?.firewall_modell)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Feste IP</dt>
                <dd className="text-sm text-gray-900">{yesNo(internet?.feste_ip)}</dd>
              </div>
              {internet?.feste_ip ? (
                <div>
                  <dt className="text-sm text-gray-500">IP-Adresse</dt>
                  <dd className="text-sm text-gray-900">{dash(internet?.ip_adresse)}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-sm text-gray-500">VPN erforderlich</dt>
                <dd className="text-sm text-gray-900">{yesNo(internet?.vpn_erforderlich)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">VPN-User (Anzahl)</dt>
                <dd className="text-sm text-gray-900">{dash(internet?.vpn_user_anzahl)}</dd>
              </div>
            </dl>
          </div>

          {/* Benutzer */}
          <div className="space-y-2 mb-6">
            <h4 className="font-semibold text-gray-800">Benutzer</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <dt className="text-sm text-gray-500">Anzahl User im Netz</dt>
                <dd className="text-sm text-gray-900">{dash(users?.netz_user_anzahl)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Anzahl Mail-User</dt>
                <dd className="text-sm text-gray-900">{dash(users?.mail_user_anzahl)}</dd>
              </div>
            </dl>
          </div>

          {/* Hardware */}
          <div className="space-y-2 mb-6">
            <h4 className="font-semibold text-gray-800">Hardware</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <dt className="text-sm text-gray-500">RAID-Level</dt>
                <dd className="text-sm text-gray-900">{dash(infrastructureData.hardware?.raid_level)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">USV vorhanden</dt>
                <dd className="text-sm text-gray-900">{yesNo(infrastructureData.hardware?.usv_vorhanden)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">USV-Modell</dt>
                <dd className="text-sm text-gray-900">{dash(infrastructureData.hardware?.usv_modell)}</dd>
              </div>
            </dl>

            <div className="mt-2">
              <dt className="text-sm text-gray-500 mb-1">Verwendete Hardware</dt>
              {verwendeteHardware.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-gray-900 space-y-1">
                  {verwendeteHardware.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>
          </div>

          {/* Mail */}
          <div className="space-y-2 mb-6">
            <h4 className="font-semibold text-gray-800">Mail</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <dt className="text-sm text-gray-500">Mail-Speicherort</dt>
                <dd className="text-sm text-gray-900">{dash(mail?.mail_speicherort)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Mail-Server Volumen</dt>
                <dd className="text-sm text-gray-900">{dash(mail?.mail_server_volumen)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">POP3-Connector</dt>
                <dd className="text-sm text-gray-900">{yesNo(mail?.pop3_connector)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Sonstige Mailadressen</dt>
                <dd className="text-sm text-gray-900">{dash(mail?.sonstige_mailadressen)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Mobiler Zugriff</dt>
                <dd className="text-sm text-gray-900">{yesNo(mail?.mobiler_zugriff)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Zertifikat erforderlich</dt>
                <dd className="text-sm text-gray-900">{yesNo(mail?.zertifikat_erforderlich)}</dd>
              </div>
            </dl>
          </div>

          {/* Software */}
          <div className="space-y-2 mb-6">
            <h4 className="font-semibold text-gray-800">Software</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <dt className="text-sm text-gray-500">Virenschutz</dt>
                <dd className="text-sm text-gray-900">{dash(software?.virenschutz)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Schnittstellen</dt>
                <dd className="text-sm text-gray-900">{dash(software?.schnittstellen)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Wartungsvertrag</dt>
                <dd className="text-sm text-gray-900">{yesNo(software?.wartungsvertrag)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Migration Support</dt>
                <dd className="text-sm text-gray-900">{yesNo(software?.migration_support)}</dd>
              </div>
            </dl>

            <div className="mt-2">
              <dt className="text-sm text-gray-500 mb-1">Verwendete Applikationen (Text)</dt>
              <dd className="text-sm text-gray-900 whitespace-pre-line">{appsText.trim() ? appsText : '—'}</dd>
            </div>

            <div className="mt-2">
              <dt className="text-sm text-gray-500 mb-1">Verwendete Applikationen (Liste)</dt>
              {appsList.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-gray-900 space-y-1">
                  {appsList.map((app, i) => (
                    <li key={i}>{app}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>
          </div>

          {/* Backup */}
          <div className="space-y-2 mb-6">
            <h4 className="font-semibold text-gray-800">Backup</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <dt className="text-sm text-gray-500">Strategie</dt>
                <dd className="text-sm text-gray-900">{dash(backup?.strategie)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">NAS vorhanden</dt>
                <dd className="text-sm text-gray-900">{yesNo(backup?.nas_vorhanden)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Externe HDDs</dt>
                <dd className="text-sm text-gray-900">{dash(backup?.externe_hdds)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Doku vorhanden</dt>
                <dd className="text-sm text-gray-900">{yesNo(backup?.dokumentation_vorhanden)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Admin-Passwörter bekannt</dt>
                <dd className="text-sm text-gray-900">{yesNo(backup?.admin_passwoerter_bekannt)}</dd>
              </div>
            </dl>
          </div>

          {/* Sonstiges */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-800">Sonstiges</h4>
            <p className="text-sm text-gray-900 whitespace-pre-line">{dash(sonstiges?.text)}</p>
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
                    : 'bg-white border-gray-300 text-gray-400'
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
                    currentOnboardingStep >= step.id ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {step.id < onboardingSteps.length && <ChevronRight className="w-5 h-5 text-gray-400 mx-4" />}
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
