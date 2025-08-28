// src/features/onboarding/OnboardingSection.jsx
import React, { useState } from 'react';
import {
  Building,
  Network,
  Shield,
  Server,
  Mail,
  Settings,
  HardDrive,
  CheckCircle,
  ChevronRight,
  Trash2,
  Plus
} from 'lucide-react';

/* ------------------------- STEP 1 (Top-Level) ------------------------- */
function Step1({
  classes,
  onboardingCustomerData,
  setOnboardingCustomerData,
  onNext,
}) {
  const { bgClass, borderClass, textClass, textSecondaryClass, inputClass } = classes;

  return (
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
                value={onboardingCustomerData[field.key] || ''}
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
                  value={onboardingCustomerData.ansprechpartner?.[field.key] || ''}
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
            onClick={onNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Weiter zur IT-Infrastruktur →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- STEP 2 (Top-Level) ------------------------- */
function Step2({
  classes,
  isDark,
  infrastructureData,
  setInfrastructureData,
  onNext,
  onBack,
}) {
  const { bgClass, borderClass, textClass, textSecondaryClass, textMutedClass, inputClass } = classes;

  // State für Systemanforderungen (pro Software-Eintrag)
  const [requirementDetails, setRequirementDetails] = useState({});

  /// Utility function for generating unique IDs
const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);

// Funktion zum Hinzufügen eines neuen Software-Eintrags
const addSoftwareEntry = () => {
  setInfrastructureData(prevData => {
    const softwareList = prevData.software?.softwareList || [];
    
    return {
      ...prevData,
      software: {
        ...prevData.software,
        softwareList: [
          ...softwareList,
          {
            id: generateId(), // More unique ID
            name: '',
            licenses: '',
            critical: '',
            description: '',
            requirements: [],
            verwendete_applikationen_text: '',
            verwendete_applikationen: []
          }
        ]
      }
    };
  });
};

// Funktion zum Entfernen eines Software-Eintrags
const removeSoftwareEntry = (index) => {
  setInfrastructureData(prevData => {
    const updatedList = prevData.software.softwareList.filter((_, i) => i !== index);
    
    return {
      ...prevData,
      software: { 
        ...prevData.software, 
        softwareList: updatedList 
      }
    };
  });
  
  // Entferne auch die zugehörigen Requirement-Details
  setRequirementDetails(prevDetails => {
    const newRequirementDetails = {...prevDetails};
    delete newRequirementDetails[index];
    return newRequirementDetails;
  });
};

// Funktion zum Aktualisieren eines Software-Eintrags
const updateSoftwareEntry = (index, field, value) => {
  setInfrastructureData(prevData => {
    const updatedList = [...prevData.software.softwareList];
    
    // Validate index to prevent errors
    if (index >= 0 && index < updatedList.length) {
      updatedList[index] = { ...updatedList[index], [field]: value };
      
      return {
        ...prevData,
        software: { ...prevData.software, softwareList: updatedList }
      };
    }
    
    return prevData; // Return unchanged if index is invalid
  });
};

// Funktion zum Hinzufügen einer Anforderung zu einem bestimmten Software-Eintrag
const addRequirement = (index) => {
  const detailKey = `${index}`;
  const requirementDetail = requirementDetails[detailKey] || {};
  
  if (requirementDetail.type && requirementDetail.detail) {
    setInfrastructureData(prevData => {
      const updatedList = [...prevData.software.softwareList];
      
      // Validate index
      if (index >= 0 && index < updatedList.length) {
        updatedList[index] = {
          ...updatedList[index],
          requirements: [
            ...(updatedList[index].requirements || []),
            { 
              id: generateId(), // Add ID for individual requirement management
              type: requirementDetail.type, 
              detail: requirementDetail.detail 
            }
          ]
        };
        
        return {
          ...prevData,
          software: { ...prevData.software, softwareList: updatedList }
        };
      }
      
      return prevData;
    });
    
    // Zurücksetzen der Eingabefelder für diesen Eintrag
    setRequirementDetails(prevDetails => ({
      ...prevDetails,
      [detailKey]: { type: '', detail: '' }
    }));
  }
};

// Funktion zum Entfernen einer Anforderung von einem bestimmten Software-Eintrag
const removeRequirement = (softwareIndex, requirementIndex) => {
  setInfrastructureData(prevData => {
    const updatedList = [...prevData.software.softwareList];
    
    // Validate indices
    if (softwareIndex >= 0 && softwareIndex < updatedList.length) {
      const updatedRequirements = [...(updatedList[softwareIndex].requirements || [])];
      
      if (requirementIndex >= 0 && requirementIndex < updatedRequirements.length) {
        updatedRequirements.splice(requirementIndex, 1);
        
        updatedList[softwareIndex] = {
          ...updatedList[softwareIndex],
          requirements: updatedRequirements
        };
        
        return {
          ...prevData,
          software: { ...prevData.software, softwareList: updatedList }
        };
      }
    }
    
    return prevData;
  });
};

// Funktion zum Aktualisieren der Requirement-Details
const updateRequirementDetail = (index, field, value) => {
  const detailKey = `${index}`;
  setRequirementDetails(prevDetails => ({
    ...prevDetails,
    [detailKey]: {
      ...(prevDetails[detailKey] || {}),
      [field]: value
    }
  }));
};
  return (
    <div className="space-y-6">
      {/* Netzwerk */}
      <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center mb-4">
          <Shield className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className={`text-lg font-medium ${textClass}`}>Netzwerk</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Internetzugangsart */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Internetzugangsart
            </label>
            <select
              value={infrastructureData.netzwerk?.internetzugangsart || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  netzwerk: { ...infrastructureData.netzwerk, internetzugangsart: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
            >
              <option value="">Bitte auswählen</option>
              <option value="DSL">DSL</option>
              <option value="VDSL">VDSL</option>
              <option value="Glasfaser">Glasfaser</option>
              <option value="Kabel">Kabel Internet</option>
              <option value="LTE">LTE/5G</option>
              <option value="Standleitung">Standleitung</option>
              <option value="Satellit">Satellit</option>
              <option value="Sonstiges">Sonstiges</option>
            </select>
          </div>

          {/* Firewall Modell */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Firewall Modell
            </label>
            <input
              type="text"
              value={infrastructureData.netzwerk?.firewall_modell || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  netzwerk: { ...infrastructureData.netzwerk, firewall_modell: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              placeholder="z.B. Sophos XG 125"
            />
          </div>

          {/* Feste IP vorhanden */}
          <div className="col-span-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="feste_ip_vorhanden"
                checked={infrastructureData.netzwerk?.feste_ip_vorhanden || false}
                onChange={(e) =>
                  setInfrastructureData({
                    ...infrastructureData,
                    netzwerk: {
                      ...infrastructureData.netzwerk,
                      feste_ip_vorhanden: e.target.checked,
                      ip_adresse: e.target.checked ? infrastructureData.netzwerk?.ip_adresse || '' : '',
                    },
                  })
                }
                className={`h-4 w-4 text-blue-600 rounded focus:ring-blue-500 ${isDark ? 'border-gray-500' : 'border-gray-300'}`}
              />
              <label htmlFor="feste_ip_vorhanden" className={`ml-2 text-sm ${textSecondaryClass}`}>
                Feste IP-Adresse vorhanden
              </label>
            </div>

            {infrastructureData.netzwerk?.feste_ip_vorhanden && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondaryClass} mb-1`}>IP-Adresse</label>
                  <input
                    type="text"
                    value={infrastructureData.netzwerk?.ip_adresse || ''}
                    onChange={(e) =>
                      setInfrastructureData({
                        ...infrastructureData,
                        netzwerk: { ...infrastructureData.netzwerk, ip_adresse: e.target.value },
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                    placeholder="z.B. 192.168.0.10"
                  />
                </div>
              </div>
            )}
          </div>

          {/* VPN Einwahl erforderlich */}
          <div className="col-span-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="vpn_einwahl_erforderlich"
                checked={infrastructureData.netzwerk?.vpn_einwahl_erforderlich || false}
                onChange={(e) =>
                  setInfrastructureData({
                    ...infrastructureData,
                    netzwerk: { ...infrastructureData.netzwerk, vpn_einwahl_erforderlich: e.target.checked },
                  })
                }
                className={`h-4 w-4 text-blue-600 rounded focus:ring-blue-500 ${isDark ? 'border-gray-500' : 'border-gray-300'}`}
              />
              <label htmlFor="vpn_einwahl_erforderlich" className={`ml-2 text-sm ${textSecondaryClass}`}>
                VPN-Einwahl erforderlich
              </label>
            </div>

            {infrastructureData.netzwerk?.vpn_einwahl_erforderlich && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondaryClass} mb-1`}>
                    Aktuelle VPN User
                  </label>
                  <input
                    type="number"
                    value={infrastructureData.netzwerk?.aktuelle_vpn_user || ''}
                    onChange={(e) =>
                      setInfrastructureData({
                        ...infrastructureData,
                        netzwerk: { ...infrastructureData.netzwerk, aktuelle_vpn_user: e.target.value },
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                    placeholder="z.B. 5"
                    min="0"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textSecondaryClass} mb-1`}>
                    Geplante VPN User
                  </label>
                  <input
                    type="number"
                    value={infrastructureData.netzwerk?.geplante_vpn_user || ''}
                    onChange={(e) =>
                      setInfrastructureData({
                        ...infrastructureData,
                        netzwerk: { ...infrastructureData.netzwerk, geplante_vpn_user: e.target.value },
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                    placeholder="z.B. 10"
                    min="0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Zusätzliche Netzwerk-Informationen */}
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Zusätzliche Netzwerk-Informationen
            </label>
            <textarea
              value={infrastructureData.netzwerk?.informationen || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  netzwerk: { ...infrastructureData.netzwerk, informationen: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              rows="3"
              placeholder="Bandbreite, Besonderheiten der Netzwerkkonfiguration, etc."
            />
          </div>
        </div>
      </div>

      {/* Hardware */}
      <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Server className="w-5 h-5 text-purple-500 mr-2" />
            <h3 className={`text-lg font-medium ${textClass}`}>Hardware</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              const hardwareList = infrastructureData.hardware?.hardwareList || [];
              setInfrastructureData({
                ...infrastructureData,
                hardware: {
                  ...infrastructureData.hardware,
                  hardwareList: [
                    ...hardwareList,
                    {
                      id: Date.now(),
                      typ: '',
                      hersteller: '',
                      modell: '',
                      seriennummer: '',
                      standort: '',
                      ip: '',
                      details_jsonb: '',
                      informationen: ''
                    }
                  ]
                }
              });
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Server className="w-4 h-4" />
            <span>Hardware hinzufügen</span>
          </button>
        </div>

        {/* Hardware-Liste */}
        <div className="space-y-6">
          {(infrastructureData.hardware?.hardwareList || []).length === 0 ? (
            <div className={`text-center py-8 border-2 border-dashed ${borderClass} rounded-lg`}>
              <Server className={`w-12 h-12 ${textMutedClass} mx-auto mb-2`} />
              <p className={`${textMutedClass} mb-4`}>Noch keine Hardware hinzugefügt</p>
              <button
                type="button"
                onClick={() => {
                  setInfrastructureData({
                    ...infrastructureData,
                    hardware: {
                      ...infrastructureData.hardware,
                      hardwareList: [{
                        id: Date.now(),
                        typ: '',
                        hersteller: '',
                        modell: '',
                        seriennummer: '',
                        standort: '',
                        ip: '',
                        details_jsonb: '',
                        informationen: ''
                      }]
                    }
                  });
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Erste Hardware hinzufügen
              </button>
            </div>
          ) : (
            (infrastructureData.hardware?.hardwareList || []).map((hardware, index) => (
              <div key={hardware.id} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg border ${borderClass}`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`text-md font-medium ${textClass}`}>
                    Hardware #{index + 1} {hardware.typ && `(${hardware.typ})`}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const updatedList = infrastructureData.hardware.hardwareList.filter((_, i) => i !== index);
                      setInfrastructureData({
                        ...infrastructureData,
                        hardware: { ...infrastructureData.hardware, hardwareList: updatedList }
                      });
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Hardware entfernen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Typ */}
                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Hardware-Typ
                    </label>
                    <select
                      value={hardware.typ || ''}
                      onChange={(e) => {
                        const updatedList = [...infrastructureData.hardware.hardwareList];
                        updatedList[index] = { ...hardware, typ: e.target.value };
                        setInfrastructureData({
                          ...infrastructureData,
                          hardware: { ...infrastructureData.hardware, hardwareList: updatedList }
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
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

                  {/* Hersteller */}
                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Hersteller
                    </label>
                    <input
                      type="text"
                      value={hardware.hersteller || ''}
                      onChange={(e) => {
                        const updatedList = [...infrastructureData.hardware.hardwareList];
                        updatedList[index] = { ...hardware, hersteller: e.target.value };
                        setInfrastructureData({
                          ...infrastructureData,
                          hardware: { ...infrastructureData.hardware, hardwareList: updatedList }
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                      placeholder="z.B. Dell, HP, Cisco"
                    />
                  </div>

                  {/* Modell */}
                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Modell
                    </label>
                    <input
                      type="text"
                      value={hardware.modell || ''}
                      onChange={(e) => {
                        const updatedList = [...infrastructureData.hardware.hardwareList];
                        updatedList[index] = { ...hardware, modell: e.target.value };
                        setInfrastructureData({
                          ...infrastructureData,
                          hardware: { ...infrastructureData.hardware, hardwareList: updatedList }
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                      placeholder="z.B. PowerEdge R750, ProLiant DL380"
                    />
                  </div>

                  {/* Seriennummer */}
                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Seriennummer
                    </label>
                    <input
                      type="text"
                      value={hardware.seriennummer || ''}
                      onChange={(e) => {
                        const updatedList = [...infrastructureData.hardware.hardwareList];
                        updatedList[index] = { ...hardware, seriennummer: e.target.value };
                        setInfrastructureData({
                          ...infrastructureData,
                          hardware: { ...infrastructureData.hardware, hardwareList: updatedList }
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                      placeholder="z.B. ABC123DEF456"
                    />
                  </div>

                  {/* Standort */}
                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Standort
                    </label>
                    <input
                      type="text"
                      value={hardware.standort || ''}
                      onChange={(e) => {
                        const updatedList = [...infrastructureData.hardware.hardwareList];
                        updatedList[index] = { ...hardware, standort: e.target.value };
                        setInfrastructureData({
                          ...infrastructureData,
                          hardware: { ...infrastructureData.hardware, hardwareList: updatedList }
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                      placeholder="z.B. Serverraum, Büro 1, Keller"
                    />
                  </div>

                  {/* IP-Adresse */}
                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      IP-Adresse
                    </label>
                    <input
                      type="text"
                      value={hardware.ip || ''}
                      onChange={(e) => {
                        const updatedList = [...infrastructureData.hardware.hardwareList];
                        updatedList[index] = { ...hardware, ip: e.target.value };
                        setInfrastructureData({
                          ...infrastructureData,
                          hardware: { ...infrastructureData.hardware, hardwareList: updatedList }
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                      placeholder="z.B. 192.168.1.100"
                    />
                  </div>

                  {/* Details (JSONB) */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Technische Details
                    </label>
                    <textarea
                      value={hardware.details_jsonb || ''}
                      onChange={(e) => {
                        const updatedList = [...infrastructureData.hardware.hardwareList];
                        updatedList[index] = { ...hardware, details_jsonb: e.target.value };
                        setInfrastructureData({
                          ...infrastructureData,
                          hardware: { ...infrastructureData.hardware, hardwareList: updatedList }
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                      rows="3"
                      placeholder="CPU: Intel Xeon Gold 6248R, RAM: 64GB DDR4, Storage: 2x 960GB SSD RAID 1"
                    />
                  </div>

                  {/* Informationen */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Zusätzliche Informationen
                    </label>
                    <textarea
                      value={hardware.informationen || ''}
                      onChange={(e) => {
                        const updatedList = [...infrastructureData.hardware.hardwareList];
                        updatedList[index] = { ...hardware, informationen: e.target.value };
                        setInfrastructureData({
                          ...infrastructureData,
                          hardware: { ...infrastructureData.hardware, hardwareList: updatedList }
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                      rows="3"
                      placeholder="Garantie, Wartungsverträge, Besonderheiten, etc."
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mail */}
      <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center mb-4">
          <Mail className="w-5 h-5 text-orange-500 mr-2" />
          <h3 className={`text-lg font-medium ${textClass}`}>Mail Server</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Anbieter */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Mail-Anbieter
            </label>
            <select
              value={infrastructureData.mail?.anbieter || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  mail: { ...infrastructureData.mail, anbieter: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
            >
              <option value="">Bitte auswählen</option>
              <option value="Exchange">Microsoft Exchange</option>
              <option value="Office365">Microsoft Office 365</option>
              <option value="Gmail">Google Workspace (Gmail)</option>
              <option value="IMAP">IMAP/POP3 Server</option>
              <option value="Other">Anderer Anbieter</option>
            </select>
          </div>

          {/* Anzahl Postfächer */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Anzahl Postfächer
            </label>
            <input
              type="number"
              value={infrastructureData.mail?.anzahl_postfach || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  mail: { ...infrastructureData.mail, anzahl_postfach: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              placeholder="z.B. 25"
              min="0"
            />
          </div>

          {/* Anzahl Shared Mailboxes */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Anzahl Shared Mailboxes
            </label>
            <input
              type="number"
              value={infrastructureData.mail?.anzahl_shared || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  mail: { ...infrastructureData.mail, anzahl_shared: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              placeholder="z.B. 5"
              min="0"
            />
          </div>

          {/* Gesamt Speicher */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Gesamt Speicher (GB)
            </label>
            <input
              type="number"
              value={infrastructureData.mail?.gesamt_speicher || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  mail: { ...infrastructureData.mail, gesamt_speicher: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              placeholder="z.B. 500"
              min="0"
              step="0.1"
            />
          </div>

          {/* Zusatzoptionen */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="pop3_connector"
              checked={infrastructureData.mail?.pop3_connector || false}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  mail: { ...infrastructureData.mail, pop3_connector: e.target.checked },
                })
              }
              className={`h-4 w-4 text-blue-600 rounded focus:ring-blue-500 ${isDark ? 'border-gray-500' : 'border-gray-300'}`}
            />
            <label htmlFor="pop3_connector" className={`ml-2 text-sm ${textSecondaryClass}`}>
              POP3-Connector vorhanden
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="mobiler_zugriff"
              checked={infrastructureData.mail?.mobiler_zugriff || false}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  mail: { ...infrastructureData.mail, mobiler_zugriff: e.target.checked },
                })
              }
              className={`h-4 w-4 text-blue-600 rounded focus:ring-blue-500 ${isDark ? 'border-gray-500' : 'border-gray-300'}`}
            />
            <label htmlFor="mobiler_zugriff" className={`ml-2 text-sm ${textSecondaryClass}`}>
              Mobiler Zugriff aktiviert
            </label>
          </div>

          {/* Informationen */}
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Informationen & Besonderheiten
            </label>
            <textarea
              value={infrastructureData.mail?.informationen || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  mail: { ...infrastructureData.mail, informationen: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              rows="3"
              placeholder="Besondere Konfigurationen, Migrationshinweise, etc."
            />
          </div>
        </div>
      </div>

      {/* Software - Überarbeitet für mehrere Einträge */}
      <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Settings className="w-5 h-5 text-indigo-500 mr-2" />
            <h3 className={`text-lg font-medium ${textClass}`}>Software</h3>
          </div>
          <button
            type="button"
            onClick={addSoftwareEntry}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Software hinzufügen</span>
          </button>
        </div>

        <div className="space-y-6">
          {(infrastructureData.software?.softwareList || []).length === 0 ? (
            <div className={`text-center py-8 border-2 border-dashed ${borderClass} rounded-lg`}>
              <Settings className={`w-12 h-12 ${textMutedClass} mx-auto mb-2`} />
              <p className={`${textMutedClass} mb-4`}>Noch keine Software hinzugefügt</p>
              <button
                type="button"
                onClick={addSoftwareEntry}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Erste Software hinzufügen
              </button>
            </div>
          ) : (
            (infrastructureData.software?.softwareList || []).map((software, index) => (
              <div key={software.id} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg border ${borderClass}`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`text-md font-medium ${textClass}`}>
                    Software #{index + 1} {software.name && `(${software.name})`}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeSoftwareEntry(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Software entfernen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Software-Name */}
                    <div>
                      <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Software-Name</label>
                      <input
                        type="text"
                        value={software.name || ''}
                        onChange={(e) => updateSoftwareEntry(index, 'name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                        placeholder="z.B. Microsoft Office"
                      />
                    </div>

                    {/* Lizenzen */}
                    <div>
                      <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Anzahl Lizenzen</label>
                      <input
                        type="number"
                        value={software.licenses || ''}
                        onChange={(e) => updateSoftwareEntry(index, 'licenses', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                        placeholder="z.B. 25"
                        min="0"
                      />
                    </div>

                    {/* Kritisch */}
                    <div>
                      <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Kritikalität</label>
                      <select
                        value={software.critical || ''}
                        onChange={(e) => updateSoftwareEntry(index, 'critical', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                      >
                        <option value="">Bitte auswählen</option>
                        <option value="hoch">Hoch (übernehmen)</option>
                        <option value="niedrig">Niedrig (nicht übernehmen)</option>
                      </select>
                    </div>
                  </div>

                  {/* Systemanforderungen - Auswahl */}
                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Systemanforderungen hinzufügen</label>
                    <div className="flex gap-2 mb-2">
                      <select
                        value={requirementDetails[`${index}`]?.type || ''}
                        onChange={(e) => updateRequirementDetail(index, 'type', e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                      >
                        <option value="">Kategorie wählen</option>
                        <option value="CPU">CPU</option>
                        <option value="RAM">RAM</option>
                        <option value="Speicher">Speicher</option>
                        <option value="Betriebssystem">Betriebssystem</option>
                        <option value="Zielumgebung">Zielumgebung</option>
                        <option value="Netzwerk">Netzwerk</option>
                        <option value="Sonstiges">Sonstiges</option>
                      </select>

                      <input
                        type="text"
                        value={requirementDetails[`${index}`]?.detail || ''}
                        onChange={(e) => updateRequirementDetail(index, 'detail', e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                        placeholder="Details (z.B. '4 Kerne')"
                        disabled={!requirementDetails[`${index}`]?.type}
                      />

                      <button
                        type="button"
                        onClick={() => addRequirement(index)}
                        disabled={!requirementDetails[`${index}`]?.type || !requirementDetails[`${index}`]?.detail}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        Hinzufügen
                      </button>
                    </div>

                    {/* Anzeige der Systemanforderungen */}
                    <div className="mt-4">
                      <h4 className={`text-sm font-medium ${textSecondaryClass} mb-2`}>Aktuelle Systemanforderungen:</h4>
                      {software.requirements?.length > 0 ? (
                        <ul className="space-y-2">
                          {software.requirements.map((req, reqIndex) => (
                            <li key={reqIndex} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
                              <span>
                                <strong>{req.type}:</strong> {req.detail}
                              </span>
                              <button
                                onClick={() => removeRequirement(index, reqIndex)}
                                className="text-red-500 hover:text-red-700"
                                aria-label="Anforderung entfernen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={`text-sm ${textSecondaryClass}`}>Noch keine Anforderungen definiert</p>
                      )}
                    </div>
                  </div>

                  {/* Beschreibung */}
                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Beschreibung</label>
                    <textarea
                      value={software.description || ''}
                      onChange={(e) => updateSoftwareEntry(index, 'description', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                      rows="3"
                      placeholder="Funktionsbeschreibung der Software"
                    />
                  </div>

                  {/* Verwendete Applikationen */}
<div>
  <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
    Wichtige Applikationen (eine pro Zeile)
  </label>
  <textarea
  value={software.verwendete_applikationen_text || ''}
  onChange={(e) => {
    const value = e.target.value;
    updateSoftwareEntry(index, 'verwendete_applikationen_text', value);
    updateSoftwareEntry(
      index,
      'verwendete_applikationen',
      value.split('\n').map(s => s.trim()).filter(Boolean)
    );
  }}
  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
  rows="5"
  placeholder={`z.B.\nMicrosoft Office\nAdobe Creative Cloud\nSage 50`}
/>

</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Backup */}
      <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center mb-4">
          <HardDrive className="w-5 h-5 text-red-500 mr-2" />
          <h3 className={`text-lg font-medium ${textClass}`}>Backup-Konfiguration</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tool */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Backup-Tool
            </label>
            <select
              value={infrastructureData.backup?.tool || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  backup: { ...infrastructureData.backup, tool: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
            >
              <option value="">Bitte auswählen</option>
              <option value="Veeam">Veeam</option>
              <option value="Acronis">Acronis</option>
              <option value="Borg">Borg Backup</option>
              <option value="Custom">Eigenes Tool</option>
            </select>
          </div>

          {/* Intervall */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Backup-Intervall
            </label>
            <select
              value={infrastructureData.backup?.interval || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  backup: { ...infrastructureData.backup, interval: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
            >
              <option value="">Bitte auswählen</option>
              <option value="täglich">Täglich</option>
              <option value="wöchentlich">Wöchentlich</option>
              <option value="monatlich">Monatlich</option>
              <option value="stündlich">Stündlich</option>
            </select>
          </div>

          {/* Aufbewahrung */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Aufbewahrungsdauer
            </label>
            <input
              type="text"
              value={infrastructureData.backup?.retention || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  backup: { ...infrastructureData.backup, retention: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              placeholder="z.B. 30 Tage"
            />
          </div>

          {/* Speicherort */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Speicherort
            </label>
            <input
              type="text"
              value={infrastructureData.backup?.location || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  backup: { ...infrastructureData.backup, location: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              placeholder="z.B. NAS, Cloud, externer Server"
            />
          </div>

          {/* Größe */}
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Geschätzte Größe (GB)
            </label>
            <input
              type="number"
              value={infrastructureData.backup?.size || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  backup: { ...infrastructureData.backup, size: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              placeholder="z.B. 500"
              step="0.1"
            />
          </div>

          {/* Zusätzliche Informationen */}
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Zusätzliche Informationen
            </label>
            <textarea
              value={infrastructureData.backup?.info || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  backup: { ...infrastructureData.backup, info: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              rows="3"
              placeholder="Weitere Details zur Backup-Strategie"
            />
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
              Sonstige Anmerkungen oder Informationen zum Kunden
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
          onClick={onBack}
          className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          ← Zurück zu Kundendaten
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Weiter zur Bestätigung →
        </button>
      </div>
    </div>
  );
}

/* ------------------------- STEP 3 (Top-Level) ------------------------- */
function Step3({
  classes,
  onboardingCustomerData,
  infrastructureData,
  loading,
  onBack,
  onFinalSubmit,
  isDark,
}) {
  const { bgClass, borderClass, textClass, textMutedClass } = classes;

  const { firmenname, email, strasse, hausnummer, plz, ort, telefonnummer, ansprechpartner } =
    onboardingCustomerData;

  // defensive Defaults, damit nichts crasht
  const users = infrastructureData.users || {};
  const mail = infrastructureData.mail || {};
  const software = infrastructureData.software || {};
  const backup = infrastructureData.backup || {};
  const sonstiges = infrastructureData.sonstiges || {};

  const yesNo = (v) => (v ? 'Ja' : 'Nein');
  const dash = (v) => (v !== undefined && v !== null && String(v).trim() !== '' ? String(v) : '—');

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

        {/* Netzwerk */}
        <div className="space-y-2 mb-6">
          <h4 className={`font-semibold ${textClass}`}>Netzwerk</h4>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {[
              { label: 'Internetzugangsart', value: infrastructureData.netzwerk?.internetzugangsart },
              { label: 'Firewall-Modell', value: infrastructureData.netzwerk?.firewall_modell },
              { label: 'Feste IP vorhanden', value: yesNo(infrastructureData.netzwerk?.feste_ip_vorhanden) },
              ...(infrastructureData.netzwerk?.feste_ip_vorhanden ? [{ label: 'IP-Adresse', value: infrastructureData.netzwerk?.ip_adresse }] : []),
              { label: 'VPN-Einwahl erforderlich', value: yesNo(infrastructureData.netzwerk?.vpn_einwahl_erforderlich) },
              ...(infrastructureData.netzwerk?.vpn_einwahl_erforderlich ? [
                { label: 'Aktuelle VPN User', value: infrastructureData.netzwerk?.aktuelle_vpn_user },
                { label: 'Geplante VPN User', value: infrastructureData.netzwerk?.geplante_vpn_user }
              ] : []),
            ].map((item) => (
              <div key={item.label}>
                <dt className={`text-sm ${textMutedClass}`}>{item.label}</dt>
                <dd className={`text-sm ${textClass}`}>{dash(item.value)}</dd>
              </div>
            ))}
          </dl>

          {infrastructureData.netzwerk?.informationen && (
            <div className="mt-2">
              <dt className={`text-sm ${textMutedClass} mb-1`}>Zusätzliche Netzwerk-Informationen</dt>
              <dd className={`text-sm ${textClass} whitespace-pre-line`}>{infrastructureData.netzwerk.informationen}</dd>
            </div>
          )}
        </div>

        {/* Benutzer (optional) */}
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

          {infrastructureData.hardware?.hardwareList?.length > 0 ? (
            <div className="space-y-4">
              {infrastructureData.hardware.hardwareList.map((hw, index) => (
                <div key={hw.id} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <h5 className={`font-medium ${textClass} mb-3`}>
                    Hardware #{index + 1} {hw.typ && `(${hw.typ})`}
                  </h5>

                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    {[
                      { label: 'Hardware-Typ', value: hw.typ },
                      { label: 'Hersteller', value: hw.hersteller },
                      { label: 'Modell', value: hw.modell },
                      { label: 'Seriennummer', value: hw.seriennummer },
                      { label: 'Standort', value: hw.standort },
                      { label: 'IP-Adresse', value: hw.ip },
                    ].map((item) => (
                      <div key={item.label}>
                        <dt className={`text-sm ${textMutedClass}`}>{item.label}</dt>
                        <dd className={`text-sm ${textClass}`}>{dash(item.value)}</dd>
                      </div>
                    ))}
                  </dl>

                  {hw.details_jsonb && (
                    <div className="mt-3">
                      <dt className={`text-sm ${textMutedClass} mb-1`}>Technische Details</dt>
                      <dd className={`text-sm ${textClass} whitespace-pre-line`}>{hw.details_jsonb}</dd>
                    </div>
                  )}

                  {hw.informationen && (
                    <div className="mt-3">
                      <dt className={`text-sm ${textMutedClass} mb-1`}>Zusätzliche Informationen</dt>
                      <dd className={`text-sm ${textClass} whitespace-pre-line`}>{hw.informationen}</dd>
                    </div>
                  )}
                </div>
              ))}
            </div>
            ) : (
            <p className={`text-sm ${textMutedClass}`}>Keine Hardware erfasst</p>
          )}
        </div>

        {/* Mail */}
        <div className="space-y-2 mb-6">
          <h4 className={`font-semibold ${textClass}`}>Mail Server</h4>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {[
              { label: 'Mail-Anbieter', value: mail?.anbieter },
              { label: 'Anzahl Postfächer', value: mail?.anzahl_postfach },
              { label: 'Anzahl Shared Mailboxes', value: mail?.anzahl_shared },
              { label: 'Gesamt Speicher (GB)', value: mail?.gesamt_speicher },
              { label: 'POP3-Connector', value: yesNo(mail?.pop3_connector) },
              { label: 'Mobiler Zugriff', value: yesNo(mail?.mobiler_zugriff) },
            ].map((item) => (
              <div key={item.label}>
                <dt className={`text-sm ${textMutedClass}`}>{item.label}</dt>
                <dd className={`text-sm ${textClass}`}>{dash(item.value)}</dd>
              </div>
            ))}
          </dl>

          {mail?.informationen && (
            <div className="mt-2">
              <dt className={`text-sm ${textMutedClass} mb-1`}>Informationen & Besonderheiten</dt>
              <dd className={`text-sm ${textClass} whitespace-pre-line`}>{mail.informationen}</dd>
            </div>
          )}
        </div>

        {/* Software */}
        <div className="space-y-2 mb-6">
          <h4 className={`font-semibold ${textClass}`}>Software</h4>
          
          {software?.softwareList?.length > 0 ? (
            <div className="space-y-4">
              {software.softwareList.map((sw, index) => {
                const appsText = sw.verwendete_applikationen_text || '';
                const appsList = Array.isArray(sw.verwendete_applikationen) ? sw.verwendete_applikationen : [];
                
                return (
                  <div key={sw.id} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <h5 className={`font-medium ${textClass} mb-3`}>
                      Software #{index + 1} {sw.name && `(${sw.name})`}
                    </h5>

                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      {[
                        { label: 'Software-Name', value: sw.name },
                        { label: 'Anzahl Lizenzen', value: sw.licenses },
                        { label: 'Kritikalität', value: sw.critical },
                      ].map((item) => (
                        <div key={item.label}>
                          <dt className={`text-sm ${textMutedClass}`}>{item.label}</dt>
                          <dd className={`text-sm ${textClass}`}>{dash(item.value)}</dd>
                        </div>
                      ))}
                    </dl>

                    {sw.description && (
                      <div className="mt-3">
                        <dt className={`text-sm ${textMutedClass} mb-1`}>Beschreibung</dt>
                        <dd className={`text-sm ${textClass} whitespace-pre-line`}>{sw.description}</dd>
                      </div>
                    )}

                    {sw.requirements?.length > 0 && (
                      <div className="mt-3">
                        <dt className={`text-sm ${textMutedClass} mb-1`}>Systemanforderungen</dt>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {sw.requirements.map((req, i) => (
                            <li key={i} className={textClass}>
                              <strong>{req.type}:</strong> {req.detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-3">
                      <dt className={`text-sm ${textMutedClass} mb-1`}>Verwendete Applikationen (Text)</dt>
                      <dd className={`text-sm ${textClass} whitespace-pre-line`}>{appsText.trim() ? appsText : '—'}</dd>
                    </div>

                    <div className="mt-3">
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
                );
              })}
            </div>
          ) : (
            <p className={`text-sm ${textMutedClass}`}>Keine Software erfasst</p>
          )}
        </div>

        {/* Backup */}
        <div className="space-y-2 mb-6">
          <h4 className={`font-semibold ${textClass}`}>Backup-Konfiguration</h4>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {[
              { label: 'Backup-Tool', value: backup?.tool },
              { label: 'Backup-Intervall', value: backup?.interval },
              { label: 'Aufbewahrungsdauer', value: backup?.retention },
              { label: 'Speicherort', value: backup?.location },
              { label: 'Geschätzte Größe (GB)', value: backup?.size },
            ].map((item) => (
              <div key={item.label}>
                <dt className={`text-sm ${textMutedClass}`}>{item.label}</dt>
                <dd className={`text-sm ${textClass}`}>{dash(item.value)}</dd>
              </div>
            ))}
          </dl>

          {backup?.info && (
            <div className="mt-2">
              <dt className={`text-sm ${textMutedClass} mb-1`}>Zusätzliche Informationen</dt>
              <dd className={`text-sm ${textClass} whitespace-pre-line`}>{backup.info}</dd>
            </div>
          )}
        </div>

        {/* Sonstiges */}
        <div className="space-y-2">
          <h4 className={`font-semibold ${textClass}`}>Sonstiges</h4>
          <p className={`text-sm ${textClass} whitespace-pre-line`}>{dash(sonstiges?.text)}</p>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={onBack}
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
}

/* ---------------------- OnboardingSection (export) ---------------------- */
export default function OnboardingSection({
  currentOnboardingStep,
  setCurrentOnboardingStep,
  onboardingCustomerData,
  setOnboardingCustomerData,
  infrastructureData,
  setInfrastructureData,
  loading,
  onFinalSubmit,
  isDark,
}) {
  const onboardingSteps = [
    { id: 1, title: 'Kundendaten', icon: Building, description: 'Firmendaten und Kontakt' },
    { id: 2, title: 'IT-Infrastruktur', icon: Network, description: 'Technische Dokumentation' },
    { id: 3, title: 'Bestätigung', icon: CheckCircle, description: 'Daten prüfen und speichern' },
  ];

  const classes = {
    bgClass: isDark ? 'bg-gray-800' : 'bg-white',
    borderClass: isDark ? 'border-gray-700' : 'border-gray-200',
    textClass: isDark ? 'text-gray-100' : 'text-gray-900',
    textSecondaryClass: isDark ? 'text-gray-300' : 'text-gray-700',
    textMutedClass: isDark ? 'text-gray-400' : 'text-gray-500',
    inputClass: isDark
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500',
  };

  const handleOnboardingCustomerSubmit = () => {
    if (!onboardingCustomerData.firmenname || !onboardingCustomerData.email) {
      alert('Bitte füllen Sie mindestens Firmenname und E-Mail aus');
      return;
    }
    setCurrentOnboardingStep(2);
  };
  const handleInfrastructureSubmit = () => setCurrentOnboardingStep(3);

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
                    : `${isDark ? 'bg-gray-700' : 'bg-white'} ${classes.borderClass} ${classes.textMutedClass}`
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
                    currentOnboardingStep >= step.id ? 'text-blue-600' : classes.textMutedClass
                  }`}
                >
                  {step.title}
                </p>
                <p className={`text-xs ${classes.textMutedClass}`}>{step.description}</p>
              </div>
              {step.id < onboardingSteps.length && (
                <ChevronRight className={`w-5 h-5 ${classes.textMutedClass} mx-4`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {currentOnboardingStep === 1 && (
        <Step1
          classes={classes}
          onboardingCustomerData={onboardingCustomerData}
          setOnboardingCustomerData={setOnboardingCustomerData}
          onNext={handleOnboardingCustomerSubmit}
        />
      )}
      {currentOnboardingStep === 2 && (
        <Step2
          classes={classes}
          isDark={isDark}
          infrastructureData={infrastructureData}
          setInfrastructureData={setInfrastructureData}
          onNext={handleInfrastructureSubmit}
          onBack={() => setCurrentOnboardingStep(1)}
        />
      )}
      {currentOnboardingStep === 3 && (
        <Step3
          classes={classes}
          onboardingCustomerData={onboardingCustomerData}
          infrastructureData={infrastructureData}
          loading={loading}
          onBack={() => setCurrentOnboardingStep(2)}
          onFinalSubmit={onFinalSubmit}
          isDark={isDark}
        />
      )}
    </div>
  );
}