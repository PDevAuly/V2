// client/src/pages/dashboard/Dashboard.jsx
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { User, Calculator, TrendingUp, Network } from 'lucide-react';

// ✅ Saubere Imports basierend auf neuer Struktur
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import useDashboardData from '../../hooks/useDashboardData';
import useDarkMode from '../../hooks/useDarkMode';

// Dashboard Sections
import Overview from './sections/Overview';
import Customers from './sections/Customers';

// Features lazy laden mit Error Boundaries
const OnboardingSection = lazy(() => import('../../features/onboarding/OnboardingSection'));
const CalculationSection = lazy(() => import('../../features/kalkulation/CalculationSection'));

// Error Boundary für Lazy-loaded Components
class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            Fehler beim Laden
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Diese Sektion konnte nicht geladen werden. Bitte versuchen Sie es später erneut.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Seite neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple Context
const DashboardContext = React.createContext();
const DashboardProvider = ({ children, value }) => (
  <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
);

export default function DashboardPage({ onLogout, userInfo }) {
  const [active, setActive] = useState('overview');
  const { isDark, toggle } = useDarkMode();
  const { loading, stats, customers, kalkulationen, loadDashboardData } = useDashboardData();

  // Onboarding State
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(1);
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
      position: '',
    },
  });
  const [infrastructureData, setInfrastructureData] = useState({
    netzwerk: {},
    hardware: {},
    mail: {},
    software: {},
    backup: {},
    sonstiges: { text: '' },
  });

  // Kalkulation State
  const [mwst, setMwst] = useState(19);
  const [calculationForm, setCalculationForm] = useState({
    kunde_id: '',
    stundensatz: 85,
    dienstleistungen: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const menuItems = [
    { id: 'overview', label: 'Übersicht', icon: TrendingUp },
    { id: 'customers', label: 'Kunden', icon: User },
    { id: 'onboarding', label: 'Kunden-Onboarding', icon: Network },
    { id: 'stundenkalkulation', label: 'Stundenkalkulation', icon: Calculator },
  ];

  const ctxValue = {
    active,
    setActive,
    loading,
    stats,
    customers,
    kalkulationen,
  };

  return (
    <DashboardProvider value={ctxValue}>
      <div className={`h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${isDark ? 'dark' : ''}`}>
        {loading && (
          <div className="fixed inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded shadow">
              Lade Daten…
            </div>
          </div>
        )}

        <Sidebar items={menuItems} active={active} onSelect={setActive} isDark={isDark} />

        <div className="flex-1 flex flex-col">
          <Header
            isDark={isDark}
            toggle={toggle}
            onRefresh={loadDashboardData}
            userInfo={userInfo}
            onLogout={onLogout}
            onLogoClick={() => setActive('overview')}
          />

          <main className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
            {active === 'overview' && (
              <Overview
                stats={stats}
                kalkulationen={kalkulationen}
                onGoCustomers={() => setActive('customers')}
              />
            )}

            {active === 'customers' && (
              <Customers customers={customers} onNewCustomer={() => setActive('onboarding')} />
            )}

            {active === 'onboarding' && (
              <LazyErrorBoundary>
                <Suspense fallback={
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-300">Lade Onboarding…</p>
                    </div>
                  </div>
                }>
                  <OnboardingSection
                    isDark={isDark}
                    currentOnboardingStep={currentOnboardingStep}
                    setCurrentOnboardingStep={setCurrentOnboardingStep}
                    onboardingCustomerData={onboardingCustomerData}
                    setOnboardingCustomerData={setOnboardingCustomerData}
                    infrastructureData={infrastructureData}
                    setInfrastructureData={setInfrastructureData}
                    loading={loading}
                    onFinalSubmit={async () => {
                      try {
                        await loadDashboardData();
                        setActive('customers');
                      } catch (error) {
                        console.error('Fehler beim Aktualisieren nach Onboarding:', error);
                        setActive('customers');
                      }
                    }}
                  />
                </Suspense>
              </LazyErrorBoundary>
            )}

            {active === 'stundenkalkulation' && (
              <LazyErrorBoundary>
                <Suspense fallback={
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-300">Lade Kalkulation…</p>
                    </div>
                  </div>
                }>
                  <CalculationSection
                    isDark={isDark}
                    customers={customers}
                    calculationForm={calculationForm}
                    setCalculationForm={setCalculationForm}
                    mwst={mwst}
                    setMwst={setMwst}
                    loading={loading}
                    onSubmit={async () => {
                      try {
                        await loadDashboardData();
                        setActive('overview');
                      } catch (error) {
                        console.error('Fehler beim Aktualisieren nach Kalkulation:', error);
                        setActive('overview');
                      }
                    }}
                  />
                </Suspense>
              </LazyErrorBoundary>
            )}

            {/* Fallback für unbekannte Sections */}
            {!['overview', 'customers', 'onboarding', 'stundenkalkulation'].includes(active) && (
              <div className="p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Sektion nicht gefunden
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Die angeforderte Sektion "{active}" existiert nicht.
                </p>
                <button
                  onClick={() => setActive('overview')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Zurück zur Übersicht
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
}