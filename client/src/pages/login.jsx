import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './login.css';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [otp, setOtp] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRef = useRef(null);

  const submitLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          requiresMfa ? { email, passwort, otp } : { email, passwort }
        ),
      });

      // 206 = MFA wird benötigt (erster Schritt erfolgreich)
      if (res.status === 206) {
        setRequiresMfa(true);
        setOtp('');
        setTimeout(() => otpRef.current?.focus(), 0);
        const body = await res.json().catch(() => ({}));
        setError(body.message || 'Bitte den 6-stelligen Code eingeben.');
        setLoading(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Unbekannter Fehler beim Login');
        setLoading(false);
        return;
      }

      // Erfolg
      onLoginSuccess?.(data.user);
    } catch (e) {
      setError('Serverfehler – bitte später erneut versuchen');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !passwort) {
      setError('Bitte E-Mail und Passwort eingeben.');
      return;
    }
    if (requiresMfa && (!otp || otp.trim().length < 6)) {
      setError('Bitte gültigen 6-stelligen Code eingeben.');
      return;
    }
    await submitLogin();
  };

  const resetFlow = () => {
    setRequiresMfa(false);
    setOtp('');
    setError('');
  };

  return (
    <div className="login-page">
      <header className="logo">
        <img src="/pauly_logo4.png" alt="Pauly Logo" />
      </header>

      <div className="overlay">
        <form onSubmit={handleSubmit}>
          <div className="con">
            <header className="head-form">
              <h2>Anmelden</h2>
              <p>
                {!requiresMfa
                  ? 'Bitte logge dich mit deiner E-Mail und deinem Passwort ein'
                  : 'MFA aktiv: Bitte gib zusätzlich deinen 6-stelligen Code ein.'}
              </p>
            </header>

            <div className="field-set">
              <input
                className="form-input"
                type="email"
                placeholder="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={requiresMfa || loading}
              />

              <input
                className="form-input"
                type="password"
                placeholder="Passwort"
                value={passwort}
                onChange={(e) => setPasswort(e.target.value)}
                required
                disabled={requiresMfa || loading}
              />

              {requiresMfa && (
                <input
                  ref={otpRef}
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="MFA-Code (6-stellig)"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  disabled={loading}
                />
              )}

              <button type="submit" className="log-in" disabled={loading}>
                {loading
                  ? 'Wird geprüft…'
                  : requiresMfa
                  ? 'Mit Code bestätigen'
                  : 'Anmelden'}
              </button>

              {error && (
                <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>
              )}

              {requiresMfa && (
                <button
                  type="button"
                  className="btn submits frgt-pass"
                  onClick={resetFlow}
                  disabled={loading}
                  title="Zurück zur Eingabe von E-Mail & Passwort"
                >
                  Zurück
                </button>
              )}
            </div>

            <div className="other">
              <button type="button" className="btn submits frgt-pass" disabled={loading}>
                Passwort vergessen ?
              </button>
              <Link to="/register" className="btn submits sign-up">
                Registrieren
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
