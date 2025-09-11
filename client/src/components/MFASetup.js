// src/components/MFASetup.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Download, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchJSON } from 'services/api'; // <- NEU: zentraler API-Wrapper

export default function MFASetup({ userInfo: propUserInfo, accessToken: propAccessToken, onMFAEnabled }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('start');
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');

  // User-Daten aus verschiedenen Quellen laden
  const [userInfo, setUserInfo] = useState(() => {
    return (
      propUserInfo ||
      JSON.parse(localStorage.getItem('currentUser') || 'null') ||
      JSON.parse(localStorage.getItem('user') || 'null')
    );
  });

  useEffect(() => {
    console.log('MFASetup userInfo:', userInfo);
  }, [userInfo]);

  const getAccessToken = () => {
    const token = propAccessToken || localStorage.getItem('accessToken');
    if (!token || token === 'fwhlwemwldung') {
      setError('Ungültiger Access-Token. Bitte loggen Sie sich erneut ein.');
      return null;
    }
    return token;
  };

  // User-ID ermitteln (robust)
  const getUserId = () => {
    if (!userInfo) return null;
    const possibleIdFields = ['mitarbeiter_id', 'id', 'user_id', '_id', 'userId'];
    for (const field of possibleIdFields) {
      if (userInfo[field]) return userInfo[field];
    }
    console.error('Keine User-ID gefunden in:', userInfo);
    return null;
  };

  const userId = getUserId();

  const startMFASetup = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getAccessToken();
      if (!token) return;

      // Wichtig: KEIN /api hier – fetchJSON hängt die Base /api an
      const data = await fetchJSON('/auth/mfa/setup/start', {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
     Authorization: `Bearer ${token}`,
   },
   body: JSON.stringify({ user_id: userId }),
 });
      if (!data?.qrDataUrl) throw new Error('Keine QR-Code-Daten erhalten');

      setQrCode(data.qrDataUrl);
      setMfaSecret(data.secret || '');
      setStep('qr');
    } catch (err) {
      console.error('MFA Setup Start Fehler:', err);
      setError(err?.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const verifyMFA = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getAccessToken();
      if (!token) return;

      const data = await fetchJSON('/auth/mfa/setup/verify', {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
   },
   body: JSON.stringify({ user_id: userId, token: verificationCode, secret: mfaSecret }),
 });

      setBackupCodes(Array.isArray(data?.backup_codes) ? data.backup_codes : []);

      // User-Info aktualisieren (einheitlich in beiden Keys)
      const updatedUser = { ...userInfo, mfa_enabled: true };
      setUserInfo(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      setStep('completed');
      if (typeof onMFAEnabled === 'function') {
        try {
          onMFAEnabled(true);
        } catch {}
      }
    } catch (err) {
      console.error('MFA Verify Fehler:', err);
      setError(err?.message || 'Verifizierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const text = backupCodes.join('\n');
    const element = document.createElement('a');
    const file = new Blob(
      [
        `Pauly Dashboard MFA Backup Codes\n\n${text}\n\nDatum: ${new Date().toLocaleString('de-DE')}`,
      ],
      { type: 'text/plain' }
    );
    element.href = URL.createObjectURL(file);
    element.download = `pauly-mfa-backup-codes.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyBackupCodes = () => {
    const text = backupCodes.join('\n');
    navigator.clipboard
      .writeText(text)
      .then(() => alert('Backup-Codes in die Zwischenablage kopiert!'))
      .catch((err) => console.error('Kopieren fehlgeschlagen:', err));
  };

  // Early returns für Fehlerbehandlung
  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <p className="text-red-600 mb-4">Benutzerinformationen nicht verfügbar</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Bitte loggen Sie sich erneut ein.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Zum Login
          </button>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <p className="text-red-600 mb-4">Benutzer-ID nicht gefunden</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Technische Details: {JSON.stringify(userInfo)}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Zwei-Faktor-Authentifizierung
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Zusätzliche Sicherheit für Ihr Konto ({userInfo.email})
                </p>
              </div>
            </div>
          </div>

          {userInfo?.mfa_enabled ? (
            <div className="p-6 text-center">
              <Shield className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                MFA ist bereits aktiviert
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Ihr Konto ist mit Zwei-Faktor-Authentifizierung geschützt.
              </p>
              <button
                onClick={() => navigate(-1)}
                className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                Zurück
              </button>
            </div>
          ) : (
            <div className="p-6">
              {step === 'start' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      MFA einrichten
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Sie benötigen eine Authenticator-App auf Ihrem Smartphone:
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {['Google Authenticator', 'Microsoft Authenticator', 'Authy', '1Password'].map((app) => (
                      <div
                        key={app}
                        className="p-3 border border-gray-200 dark:border-gray-600 rounded-md text-center"
                      >
                        <p className="text-sm text-gray-700 dark:text-gray-300">{app}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={startMFASetup}
                    disabled={loading}
                    className="w-full flex items-center justify-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : null}
                    {loading ? 'Wird vorbereitet...' : 'MFA einrichten'}
                  </button>
                </div>
              )}

              {step === 'qr' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">QR-Code scannen</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Scannen Sie den Code mit Ihrer Authenticator-App oder geben Sie den Code manuell ein:
                    </p>
                  </div>

                  <div className="flex flex-col items-center">
                    {qrCode && (
                      <img
                        src={qrCode}
                        alt="MFA QR Code"
                        className="w-48 h-48 border-2 border-gray-200 dark:border-gray-600 rounded-lg mb-4"
                      />
                    )}

                    {mfaSecret && (
                      <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-center w-full max-w-xs">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Manueller Code:</p>
                        <code className="font-mono text-sm break-all">{mfaSecret}</code>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      6-stelligen Code eingeben:
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full p-3 text-center text-lg tracking-widest border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setStep('start')}
                      disabled={loading}
                      className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      Zurück
                    </button>
                    <button
                      onClick={verifyMFA}
                      disabled={loading || verificationCode.length !== 6}
                      className="flex-1 flex items-center justify-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : null}
                      {loading ? 'Prüft...' : 'Aktivieren'}
                    </button>
                  </div>
                </div>
              )}

              {step === 'completed' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Shield className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      MFA erfolgreich aktiviert!
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Ihr Konto ist jetzt zusätzlich geschützt.
                    </p>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-4">
                    <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Backup-Codes speichern</h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                      Diese Codes können Sie verwenden, falls Ihr Handy nicht verfügbar ist.
                      <strong> Bewahren Sie diese an einem sicheren Ort auf!</strong>
                    </p>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {backupCodes.map((code, index) => (
                        <code
                          key={index}
                          className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-center font-mono text-sm"
                        >
                          {code}
                        </code>
                      ))}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={downloadBackupCodes}
                        className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700"
                      >
                        <Download className="w-4 h-4" />
                        <span>Herunterladen</span>
                      </button>
                      <button
                        onClick={copyBackupCodes}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700"
                      >
                        Kopieren
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700"
                  >
                    Zum Dashboard
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                  {error.includes('Access-Token') && (
                    <button
                      onClick={() => navigate('/login')}
                      className="mt-2 text-red-700 dark:text-red-300 underline"
                    >
                      Erneut anmelden
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
