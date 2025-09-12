// src/pages/login.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './login.css';
import { fetchJSON } from 'services/api'; // ✅ neu: API-Wrapper

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA-States
  const [mfaRequired, setMfaRequired] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [pendingUserEmail, setPendingUserEmail] = useState(null);
  const [mfaToken, setMfaToken] = useState('');

  // Einfache Session-Token generieren (da Backend keine JWT implementiert hat)
  const generateSessionToken = () => {
    return 'session_' + Math.random().toString(36).substring(2) + '_' + Date.now();
  };

  // Konsistente User-Speicherung für MFA-Setup Kompatibilität
  const saveUserData = (userData) => {
    const sessionToken = generateSessionToken();
    // Token speichern (für MFA-Setup benötigt)
    localStorage.setItem('accessToken', sessionToken);
    // User-Daten in allen erwarteten Speicherorten
    localStorage.setItem('currentUser', JSON.stringify(userData)); // MFA-Setup erwartet das
    localStorage.setItem('user', JSON.stringify(userData));        // Backup
    localStorage.setItem('userData', JSON.stringify(userData));    // Legacy
    console.log('User-Daten gespeichert:', userData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
    const data = await fetchJSON('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ email, password: passwort }),
   });

      // MFA verlangt?
      if (data?.requireMfa) {
        setMfaRequired(true);
        setPendingUserId(data.user_id);
        setPendingUserEmail(data.user?.email);
        setMfaToken('');

        // Temporären Token für MFA-Verify setzen
        const tempToken = generateSessionToken();
        localStorage.setItem('accessToken', tempToken);
        return;
      }

      // Erfolgreich ohne MFA
      if (data?.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        saveUserData(data.user);
        onLoginSuccess?.(data.user);
      } else {
        setError('Keine Benutzerdaten erhalten');
      }
    } catch (err) {
      console.error('Login Fehler:', err);
      setError(err.message || 'Serverfehler – bitte später erneut versuchen');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Token aus localStorage holen (wurde im ersten Login-Step gesetzt)
      const accessToken = localStorage.getItem('accessToken') || '';

      // ✅ auch hier fetchJSON verwenden; Header werden ergänzt
      const data = await fetchJSON('/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Authorization': accessToken ? `Bearer ${accessToken}` : undefined,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: pendingUserId,
          token: mfaToken,
        }),
      });

      // Erfolgreich mit MFA
      if (data?.user) {
        saveUserData(data.user);
        onLoginSuccess?.(data.user);
      } else {
        setError('Keine Benutzerdaten nach MFA erhalten');
      }
    } catch (err) {
      console.error('MFA Verify Fehler:', err);
      setError(err.message || 'Serverfehler – bitte später erneut versuchen');
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setMfaRequired(false);
    setPendingUserId(null);
    setPendingUserEmail(null);
    setMfaToken('');
    setError('');
    // AccessToken löschen, damit kein alter Token aktiv bleibt
    localStorage.removeItem('accessToken');
  };

  return (
    <div className="login-page">
      <header className="logo">
        <img src="/pauly_logo4.png" alt="Pauly Logo" />
      </header>

      <div className="overlay">
        {!mfaRequired ? (
          <form onSubmit={handleSubmit}>
            <div className="con">
              <header className="head-form">
                <h2>Anmelden</h2>
                <p>Bitte logge dich mit deiner E-Mail und deinem Passwort ein</p>
              </header>

              <div className="field-set">
                <input
                  className="form-input"
                  type="email"
                  placeholder="E-Mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  className="form-input"
                  type="password"
                  placeholder="Passwort"
                  value={passwort}
                  onChange={(e) => setPasswort(e.target.value)}
                  required
                />

                <button type="submit" className="log-in" disabled={loading}>
                  {loading ? 'Anmelden…' : 'Anmelden'}
                </button>

                {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}
              </div>

              <div className="other">
                <Link to="/forgot-password" className="btn submits frgt-pass">
                  Passwort vergessen ?
                </Link>
                <Link to="/register" className="btn submits sign-up">
                  Registrieren
                </Link>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyMfa}>
            <div className="con">
              <header className="head-form">
                <h2>MFA bestätigen</h2>
                <p>Bitte den 6-stelligen Code aus deiner Authenticator-App eingeben.</p>
                {pendingUserEmail && (
                  <p style={{ fontSize: '14px', color: '#666' }}>
                    Anmeldung für: {pendingUserEmail}
                  </p>
                )}
              </header>

              <div className="field-set">
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
                  required
                  style={{
                    textAlign: 'center',
                    fontSize: '18px',
                    letterSpacing: '3px'
                  }}
                />

                <button type="submit" className="log-in" disabled={loading || mfaToken.length !== 6}>
                  {loading ? 'Prüfe…' : 'Bestätigen'}
                </button>

                <button
                  type="button"
                  className="btn submits sign-up"
                  onClick={resetToLogin}
                  style={{ marginTop: 10 }}
                  disabled={loading}
                >
                  ← Zurück zum Login
                </button>

                {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}

                <div style={{ marginTop: 15, fontSize: '12px', color: '#999', textAlign: 'center' }}>
                  Haben Sie keinen Zugriff auf Ihr Handy?<br />
                  Verwenden Sie einen Ihrer Backup-Codes.
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
