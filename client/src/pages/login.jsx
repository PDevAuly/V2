// src/pages/login.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './login.css';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA-States
  const [mfaRequired, setMfaRequired] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [challengeId, setChallengeId] = useState(null); // optional, falls Backend so arbeitet
  const [tempToken, setTempToken] = useState(null);     // optional: z.B. mfaTempToken vom Login
  const [mfaToken, setMfaToken] = useState('');

  const parseJsonSafely = async (res) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, passwort }),
      });

      const data = await parseJsonSafely(res);

      if (!res.ok) {
        setError(data.error || `Login fehlgeschlagen (${res.status})`);
        return;
      }

      // MFA verlangt?
      if (data.status === 'MFA_REQUIRED' || data.mfaRequired === true) {
        setMfaRequired(true);
        setPendingUserId(data.user_id || data.userId || data.id || null);
        setChallengeId(data.challengeId || data.mfa_challenge_id || null);
        setTempToken(data.tempToken || data.mfaToken || null);
        setMfaToken('');
        return;
      }

      // Erfolgreich ohne MFA
      if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      if (data.user) localStorage.setItem('userData', JSON.stringify(data.user));

      onLoginSuccess?.(data.user || null);
    } catch {
      setError('Serverfehler – bitte später erneut versuchen');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      // Falls Backend für die Verify-Route Auth braucht (temporär oder final):
      const bearer = tempToken || localStorage.getItem('accessToken');
      if (bearer) headers.Authorization = `Bearer ${bearer}`;

      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          user_id: pendingUserId,
          token: mfaToken,
          challenge_id: challengeId, // harmless wenn Backend es ignoriert
        }),
      });

      const data = await parseJsonSafely(res);

      if (!res.ok) {
        setError(data.error || 'MFA-Code ungültig');
        return;
      }

      // Erfolgreich mit MFA
      if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      if (data.user) localStorage.setItem('userData', JSON.stringify(data.user));

      onLoginSuccess?.(data.user || null);
    } catch {
      setError('Serverfehler – bitte später erneut versuchen');
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setMfaRequired(false);
    setPendingUserId(null);
    setChallengeId(null);
    setTempToken(null);
    setMfaToken('');
    setError('');
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
                <button type="button" className="btn submits frgt-pass">
                  Passwort vergessen ?
                </button>
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
              </header>

              <div className="field-set">
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
                  required
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
                  ← Zurück
                </button>

                {error && <p style={{ color: 'red', marginTop: 10 }}>{error}</p>}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
