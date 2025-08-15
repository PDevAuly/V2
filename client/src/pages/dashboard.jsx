import React, { useState, useEffect } from 'react';
import {
  User, Clock, Settings, RotateCcw, Calculator, TrendingUp, Network, ChevronRight,
  Sun, Moon, Building, Shield, Server, Mail, HardDrive, CheckCircle
} from 'lucide-react';
import OnboardingSection from '../features/onboarding/OnboardingSection.jsx';
import CalculationSection from '../features/kalkulation/calculationSection.jsx';
import useDarkMode from '../hooks/useDarkMode';

export default function Dashboard({ onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(1);
  const { isDark, toggle } = useDarkMode();

  const API_BASE = 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
    (typeof process !== 'undefined' && 
      (process.env?.REACT_APP_API_BASE || process.env?.REACT_APP_API_URL)) ||
    'http://localhost:5000/api';

  const euro = (n) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(n || 0));

  const getJson = async (res) =>
    res.ok
      ? res.json()
      : Promise.reject(await res.json().catch(() => ({ error: res.statusText || 'Request failed' })));

  // Daten-States
  const [stats, setStats] = useState({
    activeCustomers: 0,
    runningProjects: 0,
    monthlyHours: 0,
    monthlyRevenue: 0,
  });
  const [customers, setCustomers] = useState([]);
  const [kalkulationen, setKalkulationen] = useState([]);
  const [calculationForm, setCalculationForm] = useState({
    kunde_id: '',
    stundensatz: 85,
    dienstleistungen: [{ beschreibung: '', dauer_pro_einheit: 0, anzahl: 1, info: '' }],
  });
  const [mwst, setMwst] = useState(19);

  // Onboarding-States
  const [onboardingCustomerData, setOnboardingCustomerData] = useState({
    firmenname: '',
    strasse: '',
    hausnummer: '',
    ort: '',
    plz: '',
    telefonnummer: '',
    email: '',
    ansprechpartner: { name: '', vorname: '', email: '', telefonnummer: '', position: '' },
  });

  const [infrastructureData, setInfrastructureData] = useState({
    internet: {
      zugang: '',
      feste_ip: false,
      firewall_modell: '',
      firewall_alter: '',
      vpn_erforderlich: false,
      vpn_user_anzahl: 0,
    },
    users: { netz_user_anzahl: 0, mail_user_anzahl: 0 },
    hardware: {
      server_netzteile: 'ja',
      hot_spare_hdd: 'ja',
      raid_level: '',
      usv_vorhanden: false,
      usv_modell: '',
      drucker: [],
      verwendete_hardware: [],
    },
    mail: {
      file_server_volumen: '',
      mail_server_volumen: '',
      mail_speicherort: '',
      pop3_connector: false,
      sonstige_mailadressen: 0,
      besondere_anforderungen: '',
      mobiler_zugriff: false,
      zertifikat_erforderlich: false,
    },
    software: {
      verwendete_applikationen: [],
      server_applikationen: [],
      ansprechpartner: '',
      wartungsvertrag: false,
      migration_support: false,
      virenschutz: '',
      schnittstellen: '',
    },
    backup: {
      strategie: '',
      nas_vorhanden: false,
      externe_hdds: 0,
      dokumentation_vorhanden: false,
      admin_passwoerter_bekannt: false,
    },
  });

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const testRes = await fetch(`${API_BASE}/test`);
      if (!testRes.ok) throw new Error('Backend nicht erreichbar');

      const [statsRes, customersRes, kalkulationenRes] = await Promise.all([
        fetch(`${API_BASE}/kalkulationen/stats`),
        fetch(`${API_BASE}/customers`),
        fetch(`${API_BASE}/kalkulationen`),
      ]);

      const [statsData, customersData, kalkulationenData] = await Promise.all([
        getJson(statsRes),
        getJson(customersRes),
        getJson(kalkulationenRes),
      ]);

      setStats(
        statsData ?? { activeCustomers: 0, runningProjects: 0, monthlyHours: 0, monthlyRevenue: 0 }
      );
      setCustomers(customersData ?? []);
      setKalkulationen(kalkulationenData ?? []);
    } catch (error) {
      console.warn('Fallback auf Mock-Daten:', error);
      setStats({
        activeCustomers: 999,
        runningProjects: 999,
        monthlyHours: 999,
        monthlyRevenue: 99999999,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalOnboardingSubmit = async () => {
    setLoading(true);
    try {
      const customerResponse = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingCustomerData),
      });
      if (!customerResponse.ok) throw new Error('Fehler beim Erstellen des Kunden');
      const customerResult = await customerResponse.json();
      const kundeId = customerResult.kunde.kunden_id;

      const onboardingResponse = await fetch(`${API_BASE}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kunde_id: kundeId, infrastructure_data: infrastructureData }),
      });
      if (!onboardingResponse.ok) throw new Error('Fehler beim Erstellen des Onboardings');

      alert('✅ Kunde und IT-Infrastruktur erfolgreich erfasst!');
      setCurrentOnboardingStep(1);
      setOnboardingCustomerData({
        firmenname: '',
        strasse: '',
        hausnummer: '',
        ort: '',
        plz: '',
        telefonnummer: '',
        email: '',
        ansprechpartner: { name: '', vorname: '', email: '', telefonnummer: '', position: '' },
      });
      setInfrastructureData({
        internet: { zugang: '', feste_ip: false, firewall_modell: '', firewall_alter: '', vpn_erforderlich: false, vpn_user_anzahl: 0 },
        users: { netz_user_anzahl: 0, mail_user_anzahl: 0 },
        hardware: { server_netzteile: 'ja', hot_spare_hdd: 'ja', raid_level: '', usv_vorhanden: false, usv_modell: '', drucker: [], verwendete_hardware: [] },
        mail: { file_server_volumen: '', mail_server_volumen: '', mail_speicherort: '', pop3_connector: false, sonstige_mailadressen: 0, besondere_anforderungen: '', mobiler_zugriff: false, zertifikat_erforderlich: false },
        software: { verwendete_applikationen: [], server_applikationen: [], ansprechpartner: '', wartungsvertrag: false, migration_support: false, virenschutz: '', schnittstellen: '' },
        backup: { strategie: '', nas_vorhanden: false, externe_hdds: 0, dokumentation_vorhanden: false, admin_passwoerter_bekannt: false },
      });
      loadDashboardData();
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Fehler beim Speichern: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculationSubmit = async (e) => {
    e.preventDefault();

    if (!calculationForm.kunde_id) return alert('Bitte einen Kunden auswählen.');
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
          anzahl: Number(d.anzahl || 1),
        })),
      };

      const response = await fetch(`${API_BASE}/kalkulationen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return alert(`❌ Fehler: ${err.error || response.statusText}`);
      }

      alert('✅ Kalkulation wurde erfolgreich erstellt!');
      setCalculationForm({
        kunde_id: '',
        stundensatz: 85,
        dienstleistungen: [{ beschreibung: '', dauer_pro_einheit: 0, anzahl: 1, info: '' }],
      });
      await loadDashboardData();
    } catch (error) {
      console.error('Error creating calculation:', error);
      alert('❌ Fehler beim Erstellen der Kalkulation - Backend nicht erreichbar');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Übersicht', icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400' },
    { id: 'onboarding', label: 'Kunden-Onboarding', icon: Network, color: 'text-purple-600 dark:text-purple-400' },
    { id: 'stundenkalkulation', label: 'Stundenkalkulation', icon: Calculator, color: 'text-orange-600 dark:text-orange-400' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'onboarding':
        return (
          <div className={isDark ? 'dark' : ''}>
            <OnboardingSection
              isDark={isDark}
              currentOnboardingStep={currentOnboardingStep}
              setCurrentOnboardingStep={setCurrentOnboardingStep}
              onboardingCustomerData={onboardingCustomerData}
              setOnboardingCustomerData={setOnboardingCustomerData}
              infrastructureData={infrastructureData}
              setInfrastructureData={setInfrastructureData}
              loading={loading}
              onFinalSubmit={handleFinalOnboardingSubmit}
            />
          </div>
        );

      case 'stundenkalkulation':
        return (
          <div className={isDark ? 'dark' : ''}>
            <CalculationSection
              isDark={isDark}
              customers={customers}
              calculationForm={calculationForm}
              setCalculationForm={setCalculationForm}
              mwst={mwst}
              setMwst={setMwst}
              loading={loading}
              onSubmit={handleCalculationSubmit}
            />
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Dashboard Übersicht</h2>
              <p className="text-gray-600 dark:text-gray-400">Aktuelle Statistiken und laufende Projekte</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: User, bg: 'bg-blue-500', label: 'Kunden', value: stats.activeCustomers },
                { icon: Calculator, bg: 'bg-green-500', label: 'Projekte', value: stats.runningProjects },
                { icon: Clock, bg: 'bg-orange-500', label: 'Stunden (Monat)', value: Math.round(stats.monthlyHours) + 'h' },
                { icon: TrendingUp, bg: 'bg-purple-500', label: 'Umsatz (Monat)', value: euro(stats.monthlyRevenue) },
              ].map((item, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 ${item.bg} rounded-md flex items-center justify-center`}>
                        <item.icon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{item.label}</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{item.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Aktuelle Kalkulationen</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      {['Kunde', 'Datum', 'Stunden', 'Gesamtpreis', 'Status'].map((header) => (
                        <th
                          key={header}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {kalkulationen.slice(0, 5).map((kalkulation) => (
                      <tr key={kalkulation.kalkulations_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {kalkulation.kunde_name || kalkulation.firmenname || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-300">
                            {kalkulation.datum
                              ? new Date(kalkulation.datum).toLocaleDateString('de-DE')
                              : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-300">{Number(kalkulation.gesamtzeit || 0)}h</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-300">{euro(kalkulation.gesamtpreis)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              kalkulation.status === 'erledigt'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : kalkulation.status === 'in Arbeit'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
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
    <div className={`h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${isDark ? 'dark' : ''}`}>
      {loading && (
        <div className="fixed inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded shadow">
            Lade Daten…
          </div>
        </div>
      )}

      <div className="w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Pauly Dashboard</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            BEREICHE
          </div>

          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <IconComponent
                  className={`w-4 h-4 ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-3 grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="justify-self-start">
            <h2 className="sr-only">
              {menuItems.find((item) => item.id === activeSection)?.label || 'Dashboard'}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className="justify-self-center"
            aria-label="Zur Übersicht"
          >
            <img src="/pauly_logo4.png" alt="Pauly Logo" className="h-16 w-auto" />
          </button>

          <div className="flex items-center space-x-3 justify-self-end">
            <button
              onClick={loadDashboardData}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-md"
              title="Daten aktualisieren"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <div className="relative flex items-center">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 rounded-md"
              >
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-900" />
                </div>
              </button>

              <button
                onClick={toggle}
                className="ml-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                title={isDark ? 'Hellmodus' : 'Dunkelmodus'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Mitarbeiter</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">pauly@example.com</p>
                  </div>
                  <div className="py-1">
                    <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                      Profil anzeigen
                    </button>
                    <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                      Einstellungen
                    </button>
                    <hr className="my-1 border-gray-100 dark:border-gray-800" />
                    <button 
                      onClick={onLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Abmelden
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}