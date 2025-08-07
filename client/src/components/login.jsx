import React, { useState } from 'react';
import './login.css';

const Login = ({ onSwitch, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passwort }),
      });

      const data = await res.json();

      if (res.ok) {
        onLoginSuccess(); // ← Wenn Login erfolgreich, Dashboard anzeigen
      } else {
        setError(data.error || 'Unbekannter Fehler beim Login');
      }
    } catch (err) {
      setError('Serverfehler – bitte später erneut versuchen');
    }
  };

  return (
    <div className="login-wrapper">
      <header className="logo">
        <img src="/pauly_logo4.png" alt="Pauly Logo" />
      </header>
      <div className="overlay">
        <form onSubmit={handleSubmit}>
          <div className="con">
            <header className="head-form">
              <h2>Anmelden</h2>
              <p>Bitte logge dich mit deiner E-Mail und Passwort ein</p>
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
              <button type="submit" className="log-in">
                Anmelden
              </button>
              {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
            </div>

            <div className="other">
              <button type="button" className="btn submits frgt-pass">
                Passwort vergessen
              </button>
              <button type="button" className="btn submits sign-up" onClick={onSwitch}>
                Registrieren
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
