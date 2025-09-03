// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './login.css';
import { fetchJSON } from 'services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      await fetchJSON('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      // Backend antwortet immer neutral – wir zeigen Erfolgstext
      setMsg('Wenn die E-Mail existiert, haben wir dir einen Reset-Link gesendet.');
    } catch (err) {
      // Auch bei Fehlern neutral bleiben (Security)
      console.error('Forgot error:', err);
      setMsg('Wenn die E-Mail existiert, haben wir dir einen Reset-Link gesendet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <header className="logo">
        <img src="/pauly_logo4.png" alt="Pauly Logo" />
      </header>
      <div className="overlay">
        <form onSubmit={onSubmit}>
          <div className="con">
            <header className="head-form">
              <h2>Passwort vergessen</h2>
              <p>Gib deine E-Mail ein, um einen Link zum Zurücksetzen zu erhalten.</p>
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

              <button type="submit" className="log-in" disabled={loading}>
                {loading ? 'Sende…' : 'Link senden'}
              </button>
            </div>

            {msg && (
              <p style={{ color: '#4CAF50', marginTop: 10, textAlign: 'center', fontWeight: 'bold' }}>
                {msg}
              </p>
            )}

            <div className="other">
              <Link to="/login" className="btn submits log-in">Zurück zum Login</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
