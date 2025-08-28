// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import './login.css'; // Verwende die gleichen Styles

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Fehler beim Senden der E-Mail');
        return;
      }

      setSent(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Serverfehler – bitte später erneut versuchen');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="login-page">
        <header className="logo">
          <img src="/pauly_logo4.png" alt="Pauly Logo" />
        </header>

        <div className="overlay">
          <div className="con">
            <header className="head-form">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <Mail style={{ width: '48px', height: '48px', color: '#2563eb', margin: '0 auto 16px' }} />
              </div>
              <h2>E-Mail gesendet</h2>
              <p>Falls die E-Mail-Adresse in unserem System existiert, wurde ein Reset-Link gesendet.</p>
            </header>

            <div className="field-set">
              <div style={{ 
                background: '#f0f9ff', 
                border: '1px solid #bae6fd', 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '20px' 
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>Nächste Schritte:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#0369a1' }}>
                  <li>Prüfen Sie Ihr E-Mail-Postfach</li>
                  <li>Klicken Sie auf den Reset-Link in der E-Mail</li>
                  <li>Der Link ist 1 Stunde gültig</li>
                  <li>Prüfen Sie auch Ihren Spam-Ordner</li>
                </ul>
              </div>

              <Link to="/login" className="log-in" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                Zurück zum Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <header className="logo">
        <img src="/pauly_logo4.png" alt="Pauly Logo" />
      </header>

      <div className="overlay">
        <form onSubmit={handleSubmit}>
          <div className="con">
            <header className="head-form">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Link to="/login" style={{ position: 'absolute', left: '0', color: '#666' }}>
                  <ArrowLeft style={{ width: '20px', height: '20px' }} />
                </Link>
                <h2 style={{ margin: 0 }}>Passwort vergessen</h2>
              </div>
              <p>Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.</p>
            </header>

            <div className="field-set">
              <input
                className="form-input"
                type="email"
                placeholder="Ihre E-Mail-Adresse"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />

              <button type="submit" className="log-in" disabled={loading || !email}>
                {loading ? 'Wird gesendet…' : 'Reset-Link senden'}
              </button>

              {error && <p style={{ color: 'red', marginTop: 10, textAlign: 'center' }}>{error}</p>}
            </div>

            <div className="other">
              <Link to="/login" className="btn submits sign-up">
                ← Zurück zum Login
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;