// src/components/dashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  User,
  Clock,
  Settings,
  RotateCcw,
  Calculator,
  TrendingUp,
  Network,
  ChevronRight,
} from 'lucide-react';

import OnboardingSection from '../features/onboarding/OnboardingSection.jsx';
import CalculationSection from '../features/kalkulation/calculationSection.jsx';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(1);

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

  // Laden
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

  // Submit: Onboarding (API bleibt hier!)
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
      // reset
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

  // Submit: Kalkulation (API bleibt hier!)
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
    { id: 'overview', label: 'Übersicht', icon: TrendingUp, color: 'text-blue-600' },
    { id: 'onboarding', label: 'Kunden-Onboarding', icon: Network, color: 'text-purple-600' },
    { id: 'stundenkalkulation', label: 'Stundenkalkulation', icon: Calculator, color: 'text-orange-600' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'onboarding':
        return (
          <OnboardingSection
            currentOnboardingStep={currentOnboardingStep}
            setCurrentOnboardingStep={setCurrentOnboardingStep}
            onboardingCustomerData={onboardingCustomerData}
            setOnboardingCustomerData={setOnboardingCustomerData}
            infrastructureData={infrastructureData}
            setInfrastructureData={setInfrastructureData}
            loading={loading}
            onFinalSubmit={handleFinalOnboardingSubmit}
          />
        );

      case 'stundenkalkulation':
        return (
          <CalculationSection
            customers={customers}
            calculationForm={calculationForm}
            setCalculationForm={setCalculationForm}
            mwst={mwst}
            setMwst={setMwst}
            loading={loading}
            onSubmit={handleCalculationSubmit}
          />
        );

      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard Übersicht</h2>
              <p className="text-gray-600">Aktuelle Statistiken und laufende Projekte</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Kunden</p>
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
                    <p className="text-sm font-medium text-gray-600">Projekte</p>
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
                          <span className="text-sm text-gray-900">{Number(kalkulation.gesamtzeit || 0)}h</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{euro(kalkulation.gesamtpreis)}</span>
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
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Pauly Dashboard</h1>
        </div>

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

        <div className="p-4 border-t border-gray-200">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">TOOLS</div>
          <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
            <Settings className="w-4 h-4 text-gray-500" />
            <span>Einstellungen</span>
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
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

            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </button>

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

        <main className="flex-1 p-6 overflow-auto">{renderContent()}</main>
      </div>
    </div>
  );
}
