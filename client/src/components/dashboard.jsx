import React, { useState, useEffect } from 'react';
import {
  User,
  Clock,
  UserPlus,
  ChevronRight,
  Settings,
  Bell,
  RotateCcw,
  Calculator,
  TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(false);

  // ---- API Base (Env -> Fallback auf /api für Proxy/Ingress) ----
  const API_BASE =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE) ||
    '/api';

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

  // ---- Form States ----
  const [customerForm, setCustomerForm] = useState({
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

  const [calculationForm, setCalculationForm] = useState({
    kunde_id: '',
    stundensatz: 85, // Zahl!
    dienstleistungen: [{ beschreibung: '', dauer_pro_einheit: 0, anzahl: 1, info: '' }]
  });

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
    { id: 'neukunde', label: 'Neukunde erfassen', icon: UserPlus, color: 'text-green-600' },
    { id: 'stundenkalkulation', label: 'Stundenkalkulation', icon: Calculator, color: 'text-purple-600' }
  ];

  // ---- Customer Submit ----
  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return alert(`❌ Fehler: ${err.error || response.statusText}`);
      }

      alert('✅ Kunde wurde erfolgreich erstellt!');
      setCustomerForm({
        firmenname: '',
        strasse: '',
        hausnummer: '',
        ort: '',
        plz: '',
        telefonnummer: '',
        email: '',
        ansprechpartner: { name: '', vorname: '', email: '', telefonnummer: '', position: '' }
      });
      await loadDashboardData();
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('❌ Fehler beim Erstellen des Kunden - Backend nicht erreichbar');
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

    // simple Validierung
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

  // ---- Content Switch ----
  const renderContent = () => {
    switch (activeSection) {
      case 'neukunde':
        return (
          <div className="max-w-4xl">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Neuen Kunden erfassen</h3>
                <p className="text-sm text-gray-500 mt-1">Vollständige Kundendaten für das System</p>
              </div>

              <form onSubmit={handleCustomerSubmit} className="p-6 space-y-6">
                {/* Firmendaten */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Firmenname *</label>
                    <input
                      type="text"
                      required
                      value={customerForm.firmenname}
                      onChange={(e) => setCustomerForm({ ...customerForm, firmenname: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Firmenname"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail *</label>
                    <input
                      type="email"
                      required
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="firma@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Straße *</label>
                    <input
                      type="text"
                      required
                      value={customerForm.strasse}
                      onChange={(e) => setCustomerForm({ ...customerForm, strasse: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Musterstraße"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hausnummer *</label>
                    <input
                      type="text"
                      required
                      value={customerForm.hausnummer}
                      onChange={(e) => setCustomerForm({ ...customerForm, hausnummer: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="123a"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PLZ *</label>
                    <input
                      type="text"
                      required
                      value={customerForm.plz}
                      onChange={(e) => setCustomerForm({ ...customerForm, plz: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="12345"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ort *</label>
                    <input
                      type="text"
                      required
                      value={customerForm.ort}
                      onChange={(e) => setCustomerForm({ ...customerForm, ort: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Musterstadt"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefon *</label>
                    <input
                      type="tel"
                      required
                      value={customerForm.telefonnummer}
                      onChange={(e) => setCustomerForm({ ...customerForm, telefonnummer: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+49 123 456789"
                    />
                  </div>
                </div>

                {/* Ansprechpartner */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Ansprechpartner (optional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vorname</label>
                      <input
                        type="text"
                        value={customerForm.ansprechpartner.vorname}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            ansprechpartner: { ...customerForm.ansprechpartner, vorname: e.target.value }
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
                        value={customerForm.ansprechpartner.name}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            ansprechpartner: { ...customerForm.ansprechpartner, name: e.target.value }
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
                        value={customerForm.ansprechpartner.position}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            ansprechpartner: { ...customerForm.ansprechpartner, position: e.target.value }
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="IT-Leiter"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    {loading ? 'Speichern...' : 'Kunde speichern'}
                  </button>
                </div>
              </form>
            </div>
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
                      <UserPlus className="w-4 h-4 text-white" />
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
