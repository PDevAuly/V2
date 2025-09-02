// src/pages/dashboard/Dashboard.jsx
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { User, Calculator, TrendingUp, Network } from 'lucide-react';

// ✅ Korrigierte relative Pfade - ein Level hoch
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { DashboardProvider } from './context';
import useDashboardData from 'pages/dashboard/hooks/useDashboardData';
import useDarkMode from 'hooks/useDarkMode';

import Overview from './sections/Overview';
import Customers from './sections/Customers';

// Große Features lazy laden
const OnboardingSection = lazy(() => import('features/onboarding/OnboardingSection'));
const CalculationSection = lazy(() => import('features/kalkulation/CalculationSection'));

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
              <Suspense fallback={<div className="text-gray-600 dark:text-gray-300">Lade Onboarding…</div>}>
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
                    await loadDashboardData();
                    setActive('customers');
                  }}
                />
              </Suspense>
            )}

            {active === 'stundenkalkulation' && (
              <Suspense fallback={<div className="text-gray-600 dark:text-gray-300">Lade Kalkulation…</div>}>
                <CalculationSection
                  isDark={isDark}
                  customers={customers}
                  calculationForm={calculationForm}
                  setCalculationForm={setCalculationForm}
                  mwst={mwst}
                  setMwst={setMwst}
                  loading={loading}
                  onSubmit={async () => {
                    await loadDashboardData();
                    setActive('overview');
                  }}
                />
              </Suspense>
            )}
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
}