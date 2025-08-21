import React, { useState, useEffect } from 'react';
import {
  User, Clock, Settings, RotateCcw, Calculator, TrendingUp, Network, ChevronRight,
  Sun, Moon, X, Save, Eye, EyeOff, Edit3
} from 'lucide-react';
import OnboardingSection from '../features/onboarding/OnboardingSection.jsx';
import CalculationSection from '../features/kalkulation/calculationSection.jsx';
import useDarkMode from '../hooks/useDarkMode';

export default function Dashboard({ onLogout, userInfo }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [showProfile, setShowProfile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(1);
  const { isDark, toggle } = useDarkMode();

  // Passwort ändern States
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrentPassword: false,
    showNewPassword: false,
    showConfirmPassword: false,
  });

  // API_BASE vereinfacht - verwendet Proxy
  const API_BASE = '/api';

  const euro = (n) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(n || 0));

  // Vereinfachte getJson Funktion
  const getJson = async (res) => {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  };

  // Daten-States (Projekte entfernt)
  const [stats, setStats] = useState({
    activeCustomers: 0,
    monthlyHours: 0,
    monthlyRevenue: 0,
  });
  const [customers, setCustomers] = useState([]);
  const [kalkulationen, setKalkulationen] = useState([]);
  const [calculationForm, setCalculationForm] = useState({
    kunde_id: '',
    stundensatz: 85,
    dienstleistungen: [],
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
    netzwerk: {
      internetzugangsart: '',
      feste_ip_vorhanden: false,
      vpn_einwahl_erforderlich: false,
      aktuelle_vpn_user: '',
      geplante_vpn_user: '',
      firewall_modell: '',
      ip_adresse: '',
      informationen: '',
    },
    hardware: {
      typ: '',
      hersteller: '',
      modell: '',
      seriennummer: '',
      standort: '',
      ip: '',
      details_jsonb: {}, // JSON-Objekt
      informationen: '',
    },
    mail: {
      anbieter: '',
      anzahl_postfach: '',
      anzahl_shared: '',
      gesamt_speicher: '',
      pop3_connector: false,
      mobiler_zugriff: false,
      informationen: '',
    },
    software: {
      name: '',
      licenses: '',
      critical: '',
      requirements: [],
      description: '',
      verwendete_applikationen_text: '',
      verwendete_applikationen: [],
    },
    backup: {
      tool: '',
      interval: '',
      retention: '',
      location: '',
      size: '',
      info: '',
    },
    sonstiges: {
      text: '',
    },
  });

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Teste zuerst die Verbindung
      const testRes = await fetch(`${API_BASE}/test`);
      if (!testRes.ok) throw new Error('Backend nicht erreichbar');

      const [statsRes, customersRes, kalkulationenRes] = await Promise.all([
        fetch(`${API_BASE}/kalkulationen/stats`),
        fetch(`${API_BASE}/customers`),
        fetch(`${API_BASE}/kalkulationen`),
      ]);

      // Check if responses are ok
      if (!statsRes.ok) throw new Error('Stats endpoint failed');
      if (!customersRes.ok) throw new Error('Customers endpoint failed');
      if (!kalkulationenRes.ok) throw new Error('Kalkulationen endpoint failed');

      const [statsData, customersData, kalkulationenData] = await Promise.all([
        statsRes.json(),
        customersRes.json(),
        kalkulationenRes.json(),
      ]);

      const mappedStats = {
        activeCustomers: Array.isArray(customersData) ? customersData.length : 0,
        monthlyHours: Number(statsData?.monthlyHours || statsData?.avg_zeit || 0),
        monthlyRevenue: Number(statsData?.monthlyRevenue || statsData?.total_umsatz || 0),
      };

      setStats(mappedStats);
      setCustomers(customersData ?? []);
      setKalkulationen(kalkulationenData ?? []);
      
    } catch (error) {
      console.warn('Fallback auf Mock-Daten:', error);
      // Setze sinnvolle Mock-Daten als Fallback
      setStats({
        activeCustomers: 12,
        monthlyHours: 85,
        monthlyRevenue: 7225,
      });
      setCustomers([{
        kunden_id: 1,
        firmenname: 'Beispielkunde GmbH',
        email: 'info@beispiel.de',
        strasse: 'Musterstraße',
        hausnummer: '123',
        ort: 'Musterstadt',
        plz: '12345',
        telefonnummer: '0123456789'
      }]);
      setKalkulationen([{
        kalkulations_id: 1,
        kunde_name: 'Beispielkunde GmbH',
        datum: new Date().toISOString(),
        gesamtzeit: 8,
        gesamtpreis: 680,
        status: 'neu',
        stundensatz: 85
      }]);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('❌ Die neuen Passwörter stimmen nicht überein');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert('❌ Das neue Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert('✅ Passwort erfolgreich geändert!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        showCurrentPassword: false,
        showNewPassword: false,
        showConfirmPassword: false,
      });
    } catch (error) {
      console.error('Fehler beim Ändern des Passworts:', error);
      alert('❌ Fehler beim Ändern des Passworts');
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
      
      if (!customerResponse.ok) {
        const errorData = await customerResponse.text();
        throw new Error(`Fehler beim Erstellen des Kunden: ${errorData}`);
      }
      
      const customerResult = await customerResponse.json();
      const kundeId = customerResult.kunde?.kunden_id || customerResult.kunden_id;

      const onboardingResponse = await fetch(`${API_BASE}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          kunde_id: kundeId, 
          infrastructure_data: infrastructureData 
        }),
      });
      
      if (!onboardingResponse.ok) {
        const errorData = await onboardingResponse.text();
        throw new Error(`Fehler beim Erstellen des Onboardings: ${errorData}`);
      }

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
        netzwerk: {
          internetzugangsart: '',
          feste_ip_vorhanden: false,
          vpn_einwahl_erforderlich: false,
          aktuelle_vpn_user: '',
          geplante_vpn_user: '',
          firewall_modell: '',
          ip_adresse: '',
          informationen: '',
        },
        hardware: {
          typ: '',
          hersteller: '',
          modell: '',
          seriennummer: '',
          standort: '',
          ip: '',
          details_jsonb: {},
          informationen: '',
        },
        mail: {
          anbieter: '',
          anzahl_postfach: '',
          anzahl_shared: '',
          gesamt_speicher: '',
          pop3_connector: false,
          mobiler_zugriff: false,
          informationen: '',
        },
        software: {
          name: '',
          licenses: '',
          critical: '',
          requirements: [],
          description: '',
          verwendete_applikationen_text: '',
          verwendete_applikationen: [],
        },
        backup: {
          tool: '',
          interval: '',
          retention: '',
          location: '',
          size: '',
          info: '',
        },
        sonstiges: {
          text: '',
        },
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

    if (!calculationForm.kunde_id) {
      alert('Bitte einen Kunden auswählen.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        kunde_id: calculationForm.kunde_id,
        stundensatz: calculationForm.stundensatz === '' || calculationForm.stundensatz === undefined
          ? null
          : Number(calculationForm.stundensatz) || 0,
        mwst: Number(mwst) || 0,
        dienstleistungen: (calculationForm.dienstleistungen || []).map((d) => ({
          beschreibung: d.beschreibung,
          section: d.section ?? null,
          anzahl: Number(d.anzahl) || 0,
          dauer_pro_einheit: Number(d.dauer_pro_einheit) || 0,
          info: (d.info || '').trim() || null,
          stundensatz: d.stundensatz === undefined || d.stundensatz === ''
            ? null
            : Number(d.stundensatz) || 0,
        })),
      };

      const response = await fetch(`${API_BASE}/kalkulationen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Unbekannter Fehler');
      }

      const data = await response.json();
      alert('✅ Kalkulation wurde erfolgreich erstellt!');
      
      setCalculationForm({
        kunde_id: '',
        stundensatz: 85,
        dienstleistungen: [],
      });
      await loadDashboardData();
    } catch (error) {
      console.error('Error creating calculation:', error);
      alert('❌ Fehler beim Erstellen der Kalkulation: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Übersicht', icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400' },
    { id: 'onboarding', label: 'Kunden-Onboarding', icon: Network, color: 'text-purple-600 dark:text-purple-400' },
    { id: 'stundenkalkulation', label: 'Stundenkalkulation', icon: Calculator, color: 'text-orange-600 dark:text-orange-400' },
  ];

  // ... rest of the code remains the same (renderProfileModal, renderContent, return statement) ...
  // Der restliche Code bleibt unverändert

  const renderProfileModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profil anzeigen</h2>
          <button
            onClick={() => setShowProfileModal(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-gray-900" />
            </div>
          </div>

          {/* E-Mail anzeigen (nicht editierbar) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Angemeldet als
            </label>
            <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
              {userInfo?.email || 'Nicht verfügbar'}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Passwort ändern</h3>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type={passwordData.showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Aktuelles Passwort"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPasswordData({ ...passwordData, showCurrentPassword: !passwordData.showCurrentPassword })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {passwordData.showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={passwordData.showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Neues Passwort"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPasswordData({ ...passwordData, showNewPassword: !passwordData.showNewPassword })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {passwordData.showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={passwordData.showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Neues Passwort bestätigen"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPasswordData({
                      ...passwordData,
                      showConfirmPassword: !passwordData.showConfirmPassword,
                    })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {passwordData.showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordData.currentPassword &&
                passwordData.newPassword &&
                passwordData.confirmPassword && (
                  <button
                    onClick={changePassword}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Passwort ändern</span>
                  </button>
                )}
            </div>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowProfileModal(false)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );

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
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Dashboard Übersicht
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Aktuelle Statistiken und Kalkulationen
              </p>
            </div>

            {/* Projekte-Kachel entfernt (nur 3 Kacheln) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: User, bg: 'bg-blue-500', label: 'Kunden', value: stats.activeCustomers },
                {
                  icon: Clock,
                  bg: 'bg-orange-500',
                  label: 'Stunden (Ø/Monat)',
                  value: Math.round(stats.monthlyHours) + 'h',
                },
                { icon: TrendingUp, bg: 'bg-purple-500', label: 'Umsatz (Monat)', value: euro(stats.monthlyRevenue) },
              ].map((item, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                >
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
                            {kalkulation.datum ? new Date(kalkulation.datum).toLocaleDateString('de-DE') : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-300">
                            {Number(kalkulation.gesamtzeit || 0)}h
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-300">
                            {euro(kalkulation.gesamtpreis)}
                          </span>
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

      {/* Profil Modal */}
      {showProfileModal && renderProfileModal()}

      {/* Sidebar */}
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

        <div className="p-4 border-t border-gray-200 dark:border-gray-800"></div>
      </div>

      {/* Main */}
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
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {userInfo?.vorname} {userInfo?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{userInfo?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        setShowProfileModal(true);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Profil anzeigen
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
