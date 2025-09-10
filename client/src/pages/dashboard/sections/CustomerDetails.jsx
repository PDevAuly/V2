import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Building } from 'lucide-react';
import { fetchJSON } from 'services/api';

const dash = (v) => (v !== undefined && v !== null && String(v).trim() !== '' ? String(v) : '—');

export default function CustomerDetails({ customerId, onBack, isDark }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const classes = {
    bgClass: isDark ? 'bg-gray-800' : 'bg-white',
    borderClass: isDark ? 'border-gray-700' : 'border-gray-200',
    textClass: isDark ? 'text-gray-100' : 'text-gray-900',
    textSecondaryClass: isDark ? 'text-gray-300' : 'text-gray-700',
    textMutedClass: isDark ? 'text-gray-400' : 'text-gray-500',
  };

  useEffect(() => {
    loadCustomerDetails();
  }, [customerId]);

  const loadCustomerDetails = async () => {
    setLoading(true);
    try {
      // Nur Kundendaten laden
      const customerData = await fetchJSON(`/customers/${customerId}`);
      setCustomer(customerData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={classes.textMutedClass}>Lade Kundendaten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-4">
          <button onClick={onBack} className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-xl font-semibold ${classes.textClass}`}>Fehler</h1>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-4">
          <button onClick={onBack} className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-xl font-semibold ${classes.textClass}`}>Kunde nicht gefunden</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-2xl font-semibold ${classes.textClass} mb-2`}>
              {customer.firmenname || 'Unbekannt'}
            </h1>
            <p className={classes.textMutedClass}>
              Kunde #{customer.kunden_id} • Erstellt: {customer.created_at ? new Date(customer.created_at).toLocaleDateString('de-DE') : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Kundendaten */}
      <div className={`${classes.bgClass} ${classes.borderClass} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center mb-4">
          <Building className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className={`text-lg font-medium ${classes.textClass}`}>Firmendaten</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Firmenname', value: customer.firmenname },
            { label: 'E-Mail', value: customer.email },
            { label: 'Straße', value: customer.strasse },
            { label: 'Hausnummer', value: customer.hausnummer },
            { label: 'PLZ', value: customer.plz },
            { label: 'Ort', value: customer.ort },
            { label: 'Telefon', value: customer.telefonnummer },
          ].map((item) => (
            <div key={item.label}>
              <dt className={`text-sm font-medium ${classes.textMutedClass} mb-1`}>{item.label}</dt>
              <dd className={`text-sm ${classes.textClass}`}>{dash(item.value)}</dd>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}