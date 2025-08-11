import React, { useState, useEffect } from 'react';
import {
  User,
  Clock,
  ChevronRight,
  Settings,
  Bell,
  RotateCcw,
  Calculator,
  TrendingUp,
  Network,
  Building,
  Shield,
  Server,
  Mail,
  HardDrive,
  CheckCircle
} from 'lucide-react';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(1);

  // ---- API Base (Env -> Fallback auf /api für Proxy/Ingress) ----
  const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
  (typeof process !== 'undefined' && (process.env?.REACT_APP_API_BASE || process.env?.REACT_APP_API_URL)) ||
  'http://localhost:5000/api'; // harte Fallback-URL
console.log('API_BASE =', API_BASE);

  // ---- Helpers ----
  const euro = (n) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(n || 0));

  const getJson = async (res) =>
    res.ok
      ? res.json()
      : Promise.reject(await res.json().catch(() => ({ error: res.statusText || 'Request failed' })));

  // ---- State für echte Daten ----
  const [stats, setStats] = useState({
    activeCustomers: 0,
    runningProjects: 0,
    monthlyHours: 0,
    monthlyRevenue: 0
  });
  const [customers, setCustomers] = useState([]);
  const [kalkulationen, setKalkulationen] = useState([]);

  const [calculationForm, setCalculationForm] = useState({
    kunde_id: '',
    stundensatz: 85,
    dienstleistungen: [{ beschreibung: '', dauer_pro_einheit: 0, anzahl: 1, info: '' }]
  });

  // ---- Onboarding States ----
  const [onboardingCustomerData, setOnboardingCustomerData] = useState({
    firmenname: '',
    strasse: '',
    hausnummer: '',
    ort: '',
    plz: '',
    telefonnummer: '',
    email: '',
    ansprechpartner: {
      name: '',
      vorname: '',
      email: '',
      telefonnummer: '',
      position: ''
    }
  });

  const [infrastructureData, setInfrastructureData] = useState({
    internet: {
      zugang: '',
      feste_ip: false,
      firewall_modell: '',
      firewall_alter: '',
      vpn_erforderlich: false,
      vpn_user_anzahl: 0
    },
    users: {
      netz_user_anzahl: 0,
      mail_user_anzahl: 0
    },
    hardware: {
      server_netzteile: 'ja',
      hot_spare_hdd: 'ja',
      raid_level: '',
      usv_vorhanden: false,
      usv_modell: '',
      drucker: [],
      verwendete_hardware: [] // <- NEU
    },
    mail: {
      file_server_volumen: '',
      mail_server_volumen: '',
      mail_speicherort: '',
      pop3_connector: false,
      sonstige_mailadressen: 0,
      besondere_anforderungen: '',
      mobiler_zugriff: false,
      zertifikat_erforderlich: false
    },
    software: {
      verwendete_applikationen: [],
      server_applikationen: [],
      ansprechpartner: '',
      wartungsvertrag: false,
      migration_support: false,
      virenschutz: '',
      schnittstellen: ''
    },
    backup: {
      strategie: '',
      nas_vorhanden: false,
      externe_hdds: 0,
      dokumentation_vorhanden: false,
      admin_passwoerter_bekannt: false
    }
  });

  const onboardingSteps = [
    { id: 1, title: 'Kundendaten', icon: Building, description: 'Firmendaten und Kontakt' },
    { id: 2, title: 'IT-Infrastruktur', icon: Network, description: 'Technische Dokumentation' },
    { id: 3, title: 'Bestätigung', icon: CheckCircle, description: 'Daten prüfen und speichern' }
  ];

  // ---- Daten beim Laden abrufen ----
  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Backend PING
      const testRes = await fetch(`${API_BASE}/test`);
      if (!testRes.ok) throw new Error('Backend nicht erreichbar');

      const [statsRes, customersRes, kalkulationenRes] = await Promise.all([
        fetch(`${API_BASE}/kalkulationen/stats`),
        fetch(`${API_BASE}/customers`),
        fetch(`${API_BASE}/kalkulationen`)
      ]);

      const [statsData, customersData, kalkulationenData] = await Promise.all([
        getJson(statsRes),
        getJson(customersRes),
        getJson(kalkulationenRes)
      ]);

      setStats(
        statsData ?? { activeCustomers: 0, runningProjects: 0, monthlyHours: 0, monthlyRevenue: 0 }
      );
      setCustomers(customersData ?? []);
      setKalkulationen(kalkulationenData ?? []);
    } catch (error) {
      console.warn('Fallback auf Mock-Daten:', error);
      setStats({ activeCustomers: 12, runningProjects: 8, monthlyHours: 156, monthlyRevenue: 13200 });
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Übersicht', icon: TrendingUp, color: 'text-blue-600' },
    { id: 'onboarding', label: 'Kunden-Onboarding', icon: Network, color: 'text-purple-600' },
    { id: 'stundenkalkulation', label: 'Stundenkalkulation', icon: Calculator, color: 'text-orange-600' }
  ];

  // ---- Onboarding Handlers ----
  const handleOnboardingCustomerSubmit = () => {
    if (!onboardingCustomerData.firmenname || !onboardingCustomerData.email) {
      alert('Bitte füllen Sie mindestens Firmenname und E-Mail aus');
      return;
    }
    setCurrentOnboardingStep(2);
  };

  const handleInfrastructureSubmit = () => {
    setCurrentOnboardingStep(3);
  };

  const handleFinalOnboardingSubmit = async () => {
    setLoading(true);
    
    try {
      const customerResponse = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingCustomerData)
      });

      if (!customerResponse.ok) throw new Error('Fehler beim Erstellen des Kunden');

      const customerResult = await customerResponse.json();
      const kundeId = customerResult.kunde.kunden_id;

      const onboardingResponse = await fetch(`${API_BASE}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kunde_id: kundeId,
          infrastructure_data: infrastructureData
        })
      });

      if (!onboardingResponse.ok) throw new Error('Fehler beim Erstellen des Onboardings');

      alert('✅ Kunde und IT-Infrastruktur erfolgreich erfasst!');
      setCurrentOnboardingStep(1);
      // Reset forms
      setOnboardingCustomerData({
        firmenname: '',
        strasse: '',
        hausnummer: '',
        ort: '',
        plz: '',
        telefonnummer: '',
        email: '',
        ansprechpartner: { name: '', vorname: '', email: '', telefonnummer: '', position: '' }
      });
      setInfrastructureData({
        internet: { zugang: '', feste_ip: false, firewall_modell: '', firewall_alter: '', vpn_erforderlich: false, vpn_user_anzahl: 0 },
        users: { netz_user_anzahl: 0, mail_user_anzahl: 0 },
        hardware: { server_netzteile: 'ja', hot_spare_hdd: 'ja', raid_level: '', usv_vorhanden: false, usv_modell: '', drucker: [], verwendete_hardware: [] },
        mail: { file_server_volumen: '', mail_server_volumen: '', mail_speicherort: '', pop3_connector: false, sonstige_mailadressen: 0, besondere_anforderungen: '', mobiler_zugriff: false, zertifikat_erforderlich: false },
        software: { verwendete_applikationen: [], server_applikationen: [], ansprechpartner: '', wartungsvertrag: false, migration_support: false, virenschutz: '', schnittstellen: '' },
        backup: { strategie: '', nas_vorhanden: false, externe_hdds: 0, dokumentation_vorhanden: false, admin_passwoerter_bekannt: false }
      });
      loadDashboardData();
      
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Fehler beim Speichern: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Calculation helpers ----
  const addDienstleistung = () => {
    setCalculationForm((prev) => ({
      ...prev,
      dienstleistungen: [...prev.dienstleistungen, { beschreibung: '', dauer_pro_einheit: 0, anzahl: 1, info: '' }]
    }));
  };

  const removeDienstleistung = (index) => {
    setCalculationForm((prev) => ({
      ...prev,
      dienstleistungen: prev.dienstleistungen.filter((_, i) => i !== index)
    }));
  };

  const updateDienstleistung = (index, field, value) => {
    setCalculationForm((prev) => {
      const newList = [...prev.dienstleistungen];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, dienstleistungen: newList };
    });
  };

  const calculateTotal = () => {
    const sumHours = calculationForm.dienstleistungen.reduce(
      (acc, d) => acc + (Number(d.dauer_pro_einheit) || 0) * (Number(d.anzahl) || 1),
      0
    );
    return sumHours * Number(calculationForm.stundensatz || 0);
  };

  // ---- Calculation Submit ----
  const handleCalculationSubmit = async (e) => {
    e.preventDefault();

    if (!calculationForm.kunde_id) {
      return alert('Bitte einen Kunden auswählen.');
    }
    if (
      calculationForm.dienstleistungen.length === 0 ||
      calculationForm.dienstleistungen.some((d) => !d.beschreibung || !Number(d.dauer_pro_einheit))
    ) {
      return alert('Bitte alle Dienstleistungen vollständig ausfüllen.');
    }

    setLoading(true);

    try {
      const payload = {
        ...calculationForm,
        stundensatz: Number(calculationForm.stundensatz),
        dienstleistungen: calculationForm.dienstleistungen.map((d) => ({
          ...d,
          dauer_pro_einheit: Number(d.dauer_pro_einheit),
          anzahl: Number(d.anzahl || 1)
        }))
      };

      const response = await fetch(`${API_BASE}/kalkulationen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return alert(`❌ Fehler: ${err.error || response.statusText}`);
      }

      alert('✅ Kalkulation wurde erfolgreich erstellt!');
      setCalculationForm({
        kunde_id: '',
        stundensatz: 85,
        dienstleistungen: [{ beschreibung: '', dauer_pro_einheit: 0, anzahl: 1, info: '' }]
      });
      await loadDashboardData();
    } catch (error) {
      console.error('Error creating calculation:', error);
      alert('❌ Fehler beim Erstellen der Kalkulation - Backend nicht erreichbar');
    } finally {
      setLoading(false);
    }
  };

  // ---- Onboarding Step Renders ----
  const renderOnboardingStep1 = () => (
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
              onChange={(e) => setOnboardingCustomerData({...onboardingCustomerData, firmenname: e.target.value})}
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
              onChange={(e) => setOnboardingCustomerData({...onboardingCustomerData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="firma@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Straße *</label>
            <input
              type="text"
              value={onboardingCustomerData.strasse}
              onChange={(e) => setOnboardingCustomerData({...onboardingCustomerData, strasse: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Musterstraße"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hausnummer *</label>
            <input
              type="text"
              value={onboardingCustomerData.hausnummer}
              onChange={(e) => setOnboardingCustomerData({...onboardingCustomerData, hausnummer: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123a"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PLZ *</label>
            <input
              type="text"
              value={onboardingCustomerData.plz}
              onChange={(e) => setOnboardingCustomerData({...onboardingCustomerData, plz: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ort *</label>
            <input
              type="text"
              value={onboardingCustomerData.ort}
              onChange={(e) => setOnboardingCustomerData({...onboardingCustomerData, ort: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Musterstadt"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefon *</label>
            <input
              type="tel"
              value={onboardingCustomerData.telefonnummer}
              onChange={(e) => setOnboardingCustomerData({...onboardingCustomerData, telefonnummer: e.target.value})}
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
                onChange={(e) => setOnboardingCustomerData({
                  ...onboardingCustomerData, 
                  ansprechpartner: {...onboardingCustomerData.ansprechpartner, vorname: e.target.value}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Max"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nachname</label>
              <input
                type="text"
                value={onboardingCustomerData.ansprechpartner.name}
                onChange={(e) => setOnboardingCustomerData({
                  ...onboardingCustomerData, 
                  ansprechpartner: {...onboardingCustomerData.ansprechpartner, name: e.target.value}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mustermann"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
              <input
                type="text"
                value={onboardingCustomerData.ansprechpartner.position}
                onChange={(e) => setOnboardingCustomerData({
                  ...onboardingCustomerData, 
                  ansprechpartner: {...onboardingCustomerData.ansprechpartner, position: e.target.value}
                })}
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

  const renderOnboardingStep2 = () => (
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
              onChange={(e) => setInfrastructureData({
                ...infrastructureData,
                internet: {...infrastructureData.internet, zugang: e.target.value}
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. DSL 100/40 Mbit, Glasfaser..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Firewall Modell</label>
            <input
              type="text"
              value={infrastructureData.internet.firewall_modell}
              onChange={(e) => setInfrastructureData({
                ...infrastructureData,
                internet: {...infrastructureData.internet, firewall_modell: e.target.value}
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Sophos XG 125"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="feste_ip"
              checked={infrastructureData.internet.feste_ip}
              onChange={(e) => setInfrastructureData({
                ...infrastructureData,
                internet: {...infrastructureData.internet, feste_ip: e.target.checked}
              })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="feste_ip" className="ml-2 text-sm text-gray-700">
              Feste IP-Adresse vorhanden
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="vpn_erforderlich"
              checked={infrastructureData.internet.vpn_erforderlich}
              onChange={(e) => setInfrastructureData({
                ...infrastructureData,
                internet: {...infrastructureData.internet, vpn_erforderlich: e.target.checked}
              })}
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
              onChange={(e) => setInfrastructureData({
                ...infrastructureData,
                users: {...infrastructureData.users, netz_user_anzahl: parseInt(e.target.value) || 0}
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Anzahl Mail-User</label>
            <input
              type="number"
              value={infrastructureData.users.mail_user_anzahl}
              onChange={(e) => setInfrastructureData({
                ...infrastructureData,
                users: {...infrastructureData.users, mail_user_anzahl: parseInt(e.target.value) || 0}
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
            />
          </div>
        </div>
      </div>

     {/* Hardware */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <div className="flex items-center mb-4">
    <Server className="w-5 h-5 text-purple-600 mr-2" />
    <h3 className="text-lg font-medium text-gray-900">Hardware</h3>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">RAID Level</label>
      <input
        type="text"
        value={infrastructureData.hardware.raid_level}
        onChange={(e) => setInfrastructureData({
          ...infrastructureData,
          hardware: {...infrastructureData.hardware, raid_level: e.target.value}
        })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="z.B. RAID 1, RAID 5"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">USV Modell</label>
      <input
        type="text"
        value={infrastructureData.hardware.usv_modell}
        onChange={(e) => setInfrastructureData({
          ...infrastructureData,
          hardware: {...infrastructureData.hardware, usv_modell: e.target.value}
        })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="z.B. APC Smart-UPS 1500"
      />
    </div>

    {/* NEU: Hardware hinzufügen mit Dropdown */}
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Hardware hinzufügen
      </label>
      
      {/* Eingabezeile mit Dropdown und Button */}
      <div className="flex gap-2 mb-3">
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              // Füge die ausgewählte Hardware-Kategorie zur Liste hinzu
              const newHardware = [...(infrastructureData.hardware.verwendete_hardware || [])];
              // Prüfe ob schon vorhanden
              if (!newHardware.some(hw => hw.startsWith(e.target.value))) {
                newHardware.push(e.target.value);
                setInfrastructureData({
                  ...infrastructureData,
                  hardware: {
                    ...infrastructureData.hardware,
                    verwendete_hardware: newHardware
                  }
                });
              }
              e.target.value = ''; // Reset dropdown
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Hardware-Typ auswählen...</option>
          <optgroup label="Server & Storage">
            <option value="Server">Server</option>
            <option value="NAS">NAS (Network Attached Storage)</option>
            <option value="SAN">SAN (Storage Area Network)</option>
            <option value="Backup-Server">Backup-Server</option>
            <option value="Virtualisierungs-Host">Virtualisierungs-Host</option>
          </optgroup>
          <optgroup label="Netzwerk">
            <option value="Router">Router</option>
            <option value="Firewall">Firewall</option>
            <option value="Switch">Switch</option>
            <option value="Access Point">WLAN Access Point</option>
            <option value="Load Balancer">Load Balancer</option>
          </optgroup>
          <optgroup label="Arbeitsplatz">
            <option value="Desktop-PC">Desktop-PC</option>
            <option value="Notebook">Notebook</option>
            <option value="Thin Client">Thin Client</option>
            <option value="Tablet">Tablet</option>
            <option value="Smartphone">Smartphone (Firmengerät)</option>
          </optgroup>
          <optgroup label="Peripherie">
            <option value="Drucker">Drucker</option>
            <option value="Scanner">Scanner</option>
            <option value="Plotter">Plotter</option>
            <option value="Kopierer">Kopierer/Multifunktionsgerät</option>
          </optgroup>
          <optgroup label="Infrastruktur">
            <option value="USV">USV (Unterbrechungsfreie Stromversorgung)</option>
            <option value="KVM-Switch">KVM-Switch</option>
            <option value="PDU">PDU (Power Distribution Unit)</option>
            <option value="Klimaanlage">Klimaanlage Serverraum</option>
          </optgroup>
          <optgroup label="Spezial">
            <option value="Telefonanlage">Telefonanlage</option>
            <option value="Videokonferenz">Videokonferenz-System</option>
            <option value="Zeiterfassung">Zeiterfassungs-Terminal</option>
            <option value="Zugangskontrolle">Zugangskontrolle-System</option>
          </optgroup>
        </select>

        {/* Oder manuell eingeben */}
        <input
          type="text"
          placeholder="Oder manuell eingeben..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              e.preventDefault();
              const newHardware = [...(infrastructureData.hardware.verwendete_hardware || [])];
              newHardware.push(e.target.value.trim());
              setInfrastructureData({
                ...infrastructureData,
                hardware: {
                  ...infrastructureData.hardware,
                  verwendete_hardware: newHardware
                }
              });
              e.target.value = '';
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Liste der hinzugefügten Hardware */}
      {infrastructureData.hardware.verwendete_hardware?.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-gray-600 mb-2">Hinzugefügte Hardware:</p>
          <div className="space-y-2">
            {infrastructureData.hardware.verwendete_hardware.map((hw, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                <div className="flex items-center">
                  {/* Icon basierend auf Hardware-Typ */}
                  <span className="mr-2">
                    {hw.includes('Server') && '🖥️'}
                    {hw.includes('Router') && '🔀'}
                    {hw.includes('Firewall') && '🛡️'}
                    {hw.includes('Switch') && '🔌'}
                    {hw.includes('USV') && '🔋'}
                    {hw.includes('NAS') && '💾'}
                    {hw.includes('Desktop') && '🖥️'}
                    {hw.includes('Notebook') && '💻'}
                    {hw.includes('Drucker') && '🖨️'}
                    {hw.includes('Telefon') && '☎️'}
                    {!hw.includes('Server') && !hw.includes('Router') && !hw.includes('Firewall') && 
                     !hw.includes('Switch') && !hw.includes('USV') && !hw.includes('NAS') && 
                     !hw.includes('Desktop') && !hw.includes('Notebook') && !hw.includes('Drucker') && 
                     !hw.includes('Telefon') && '📦'}
                  </span>
                  <span className="text-sm text-gray-700">{hw}</span>
                </div>
                
                {/* Optionale Details */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Details hinzufügen..."
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        const updatedHardware = [...infrastructureData.hardware.verwendete_hardware];
                        updatedHardware[index] = `${hw} - ${e.target.value.trim()}`;
                        setInfrastructureData({
                          ...infrastructureData,
                          hardware: {
                            ...infrastructureData.hardware,
                            verwendete_hardware: updatedHardware
                          }
                        });
                      }
                    }}
                    className="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  
                  <button
                    type="button"
                    onClick={() => {
                      const updatedHardware = infrastructureData.hardware.verwendete_hardware.filter((_, i) => i !== index);
                      setInfrastructureData({
                        ...infrastructureData,
                        hardware: {
                          ...infrastructureData.hardware,
                          verwendete_hardware: updatedHardware
                        }
                      });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hilfetext */}
      <p className="text-xs text-gray-500 mt-2">
        Wählen Sie Hardware-Typen aus der Liste oder geben Sie spezifische Modelle manuell ein. 
        Sie können Details zu jedem Eintrag hinzufügen.
      </p>
    </div>

    {/* Zusätzliche Hardware-Checkboxen */}
    <div className="md:col-span-2">
      <p className="text-sm font-medium text-gray-700 mb-3">Weitere Hardware-Eigenschaften</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={infrastructureData.hardware.server_netzteile === 'ja'}
            onChange={(e) => setInfrastructureData({
              ...infrastructureData,
              hardware: {...infrastructureData.hardware, server_netzteile: e.target.checked ? 'ja' : 'nein'}
            })}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Redundante Netzteile</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={infrastructureData.hardware.hot_spare_hdd === 'ja'}
            onChange={(e) => setInfrastructureData({
              ...infrastructureData,
              hardware: {...infrastructureData.hardware, hot_spare_hdd: e.target.checked ? 'ja' : 'nein'}
            })}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Hot-Spare HDD</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={infrastructureData.hardware.usv_vorhanden}
            onChange={(e) => setInfrastructureData({
              ...infrastructureData,
              hardware: {...infrastructureData.hardware, usv_vorhanden: e.target.checked}
            })}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">USV vorhanden</span>
        </label>
      </div>
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
              onChange={(e) => setInfrastructureData({
                ...infrastructureData,
                mail: {...infrastructureData.mail, mail_speicherort: e.target.value}
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Exchange, Office 365"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mail Server Volumen</label>
            <input
              type="text"
              value={infrastructureData.mail.mail_server_volumen}
              onChange={(e) => setInfrastructureData({
                ...infrastructureData,
                mail: {...infrastructureData.mail, mail_server_volumen: e.target.value}
              })}
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
              onChange={(e) => setInfrastructureData({
                ...infrastructureData,
                software: {...infrastructureData.software, virenschutz: e.target.value}
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Sophos, Kaspersky"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Verwendete Applikationen (eine pro Zeile)</label>
            <textarea
              value={infrastructureData.software.verwendete_applikationen.join('\n')}
              onChange={(e) => setInfrastructureData({
                ...infrastructureData,
                software: {
                  ...infrastructureData.software, 
                  verwendete_applikationen: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="z.B.&#10;Microsoft Office&#10;Adobe Creative Suite&#10;Sage 50..."
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
              onChange={(e) => setInfrastructureData({
                ...infrastructureData,
                backup: {...infrastructureData.backup, strategie: e.target.value}
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="2"
              placeholder="z.B. Tägliches Backup auf NAS, wöchentliches Offsite-Backup..."
            />
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={infrastructureData.backup.nas_vorhanden}
                onChange={(e) => setInfrastructureData({
                  ...infrastructureData,
                  backup: {...infrastructureData.backup, nas_vorhanden: e.target.checked}
                })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">NAS vorhanden</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={infrastructureData.backup.dokumentation_vorhanden}
                onChange={(e) => setInfrastructureData({
                  ...infrastructureData,
                  backup: {...infrastructureData.backup, dokumentation_vorhanden: e.target.checked}
                })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Dokumentation vorhanden</span>
            </label>
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

  const renderOnboardingStep3 = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Zusammenfassung</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-700">Kunde:</h4>
            <p className="text-gray-600">{onboardingCustomerData.firmenname} - {onboardingCustomerData.email}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700">Benutzer:</h4>
            <p className="text-gray-600">
              {infrastructureData.users.netz_user_anzahl} Netzwerk-User, {infrastructureData.users.mail_user_anzahl} Mail-User
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700">Internet:</h4>
            <p className="text-gray-600">{infrastructureData.internet.zugang || 'Nicht angegeben'}</p>
          </div>

          <div>
            <h4 className="font-medium text-gray-700">Software:</h4>
            <p className="text-gray-600">
              {infrastructureData.software.verwendete_applikationen.length > 0 
                ? infrastructureData.software.verwendete_applikationen.slice(0, 3).join(', ') + 
                  (infrastructureData.software.verwendete_applikationen.length > 3 ? '...' : '')
                : 'Keine angegeben'}
            </p>
          </div>

          {/* NEU: Hardware-Zusammenfassung */}
          <div>
            <h4 className="font-medium text-gray-700">Hardware:</h4>
            <p className="text-gray-600">
              {infrastructureData.hardware.verwendete_hardware?.length > 0
                ? infrastructureData.hardware.verwendete_hardware.slice(0, 3).join(', ') +
                  (infrastructureData.hardware.verwendete_hardware.length > 3 ? '...' : '')
                : 'Keine angegeben'}
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-700">Backup:</h4>
            <p className="text-gray-600">{infrastructureData.backup.strategie || 'Nicht definiert'}</p>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => setCurrentOnboardingStep(2)}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            ← Zurück zur IT-Infrastruktur
          </button>
          <button
            onClick={handleFinalOnboardingSubmit}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
          >
            {loading ? 'Speichern...' : '✅ Kunde und IT-Infrastruktur speichern'}
          </button>
        </div>
      </div>
    </div>
  );

  // ---- Content Switch ----
  const renderContent = () => {
    switch (activeSection) {
      case 'onboarding':
        return (
          <div className="max-w-6xl">
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {onboardingSteps.map((step) => (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      currentOnboardingStep >= step.id 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      {currentOnboardingStep > step.id ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${
                        currentOnboardingStep >= step.id ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                    {step.id < onboardingSteps.length && (
                      <ChevronRight className="w-5 h-5 text-gray-400 mx-4" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            {currentOnboardingStep === 1 && renderOnboardingStep1()}
            {currentOnboardingStep === 2 && renderOnboardingStep2()}
            {currentOnboardingStep === 3 && renderOnboardingStep3()}
          </div>
        );

      case 'stundenkalkulation':
        return (
          <div className="max-w-4xl">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Stundenkalkulation erstellen</h3>
                <p className="text-sm text-gray-500 mt-1">Neue Kalkulation mit Dienstleistungen</p>
              </div>

              <form onSubmit={handleCalculationSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kunde auswählen *</label>
                    <select
                      required
                      value={calculationForm.kunde_id}
                      onChange={(e) => setCalculationForm({ ...calculationForm, kunde_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Kunde wählen...</option>
                      {customers.map((kunde) => (
                        <option key={kunde.kunden_id} value={kunde.kunden_id}>
                          {kunde.firmenname}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stundensatz (€) *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={calculationForm.stundensatz}
                      onChange={(e) =>
                        setCalculationForm({ ...calculationForm, stundensatz: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="85.00"
                    />
                  </div>
                </div>

                {/* Dienstleistungen */}
                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900">Dienstleistungen</h4>
                    <button
                      type="button"
                      onClick={addDienstleistung}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      + Dienstleistung hinzufügen
                    </button>
                  </div>

                  {calculationForm.dienstleistungen.map((dienst, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 bg-gray-50 rounded-md">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Beschreibung *</label>
                        <input
                          type="text"
                          required
                          value={dienst.beschreibung}
                          onChange={(e) => updateDienstleistung(index, 'beschreibung', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="z.B. Server-Setup"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Stunden pro Einheit *</label>
                        <input
                          type="number"
                          required
                          step="0.5"
                          value={dienst.dauer_pro_einheit}
                          onChange={(e) => updateDienstleistung(index, 'dauer_pro_einheit', Number(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="2.0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Anzahl</label>
                        <input
                          type="number"
                          min="1"
                          value={dienst.anzahl}
                          onChange={(e) => updateDienstleistung(index, 'anzahl', Number(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-end">
                        {calculationForm.dienstleistungen.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDienstleistung(index)}
                            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                          >
                            Entfernen
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {Number(calculationForm.stundensatz) > 0 &&
                  calculationForm.dienstleistungen.some((d) => Number(d.dauer_pro_einheit) > 0) && (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                      <div className="text-center">
                        <p className="text-sm text-blue-600 mb-2">Geschätzte Gesamtkosten</p>
                        <p className="text-3xl font-bold text-blue-900">{euro(calculateTotal())}</p>
                      </div>
                    </div>
                  )}

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
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard Übersicht</h2>
              <p className="text-gray-600">Aktuelle Statistiken und laufende Projekte</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Aktive Kunden</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.activeCustomers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <Calculator className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Laufende Projekte</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.runningProjects}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Stunden (Monat)</p>
                    <p className="text-2xl font-semibold text-gray-900">{Math.round(stats.monthlyHours)}h</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Umsatz (Monat)</p>
                    <p className="text-2xl font-semibold text-gray-900">{euro(stats.monthlyRevenue)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Aktuelle Kalkulationen */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Aktuelle Kalkulationen</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kunde
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Datum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stunden
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gesamtpreis
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {kalkulationen.slice(0, 5).map((kalkulation) => (
                      <tr key={kalkulation.kalkulations_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {kalkulation.kunde_name || kalkulation.firmenname || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {kalkulation.datum
                              ? new Date(kalkulation.datum).toLocaleDateString('de-DE')
                              : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {Number(kalkulation.gesamtzeit || 0)}h
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {euro(kalkulation.gesamtpreis)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              kalkulation.status === 'erledigt'
                                ? 'bg-green-100 text-green-800'
                                : kalkulation.status === 'in Arbeit'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {kalkulation.status || 'neu'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white px-4 py-2 rounded shadow">Lade Daten…</div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo/Brand */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Pauly Dashboard</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">BEREICHE</div>

          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 text-blue-600" />}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">TOOLS</div>
          <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
            <Settings className="w-4 h-4 text-gray-500" />
            <span>Einstellungen</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              {menuItems.find((item) => item.id === activeSection)?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadDashboardData}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
              title="Daten aktualisieren"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
              <Bell className="w-5 h-5" />
            </button>

            {/* Profile Button */}
            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </button>

              {/* Profile Dropdown */}
              {showProfile && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">Mitarbeiter</p>
                    <p className="text-xs text-gray-500">pauly@example.com</p>
                  </div>
                  <div className="py-1">
                    <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Profil anzeigen
                    </button>
                    <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Einstellungen
                    </button>
                    <hr className="my-1 border-gray-100" />
                    <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Abmelden
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-auto">{renderContent()}</main>
      </div>
    </div>
  );
}
