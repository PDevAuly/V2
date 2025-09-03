// src/pages/ResetPassword.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './login.css';
import { fetchJSON } from 'services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  // Optional: Token vorab validieren (dein Backend bietet /auth/validate-reset-token)
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (!token) {
        setMsg('Ungültiger Link: Token fehlt.');
        setValid(false);
        setChecking(false);
        return;
      }
      try {
        await fetchJSON('/auth/validate-reset-token', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        if (mounted) {
          setValid(true);
          setMsg('');
        }
      } catch (err) {
        console.error('Validate token error:', err);
        if (mounted) {
          setValid(false);
          setMsg('Ungültiger oder abgelaufener Reset-Link.');
        }
      } finally {
        if (mounted) setChecking(false);
      }
    };
    check();
    return () => { mounted = false; };
  }, [token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');

    if (!token) {
      setMsg('Ungültiger Link.');
      return;
    }
    if (newPassword !== repeatPassword) {
      setMsg('Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);
    try {
      await fetchJSON('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      setMsg('Passwort erfolgreich geändert. Du wirst zum Login weitergeleitet…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      console.error('Reset error:', err);
      setMsg(err.message || 'Fehler beim Zurücksetzen des Passworts.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="login-page">
        <header className="logo">
          <img src="/pauly_logo4.png" alt="Pauly Logo" />
        </header>
        <div className="overlay">
          <div className="con">
            <header className="head-form">
              <h2>Prüfe Link…</h2>
            </header>
          </div>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="login-page">
        <header className="logo">
          <img src="/pauly_logo4.png" alt="Pauly Logo" />
        </header>
        <div className="overlay">
          <div className="con">
            <header className="head-form">
              <h2>Reset-Link ungültig</h2>
              <p>{msg || 'Bitte fordere einen neuen Link an.'}</p>
            </header>
            <div className="other">
              <Link to="/forgot-password" className="btn submits frgt-pass">Neuen Link anfordern</Link>
              <Link to="/login" className="btn submits log-in">Zurück zum Login</Link>
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
        <form onSubmit={onSubmit}>
          <div className="con">
            <header className="head-form">
              <h2>Neues Passwort setzen</h2>
              <p>Bitte gib dein neues Passwort ein.</p>
            </header>

            <div className="field-set">
              <input
                className="form-input"
                type="password"
                placeholder="Neues Passwort"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <input
                className="form-input"
                type="password"
                placeholder="Passwort bestätigen"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                required
              />

              <button type="submit" className="log-in" disabled={loading}>
                {loading ? 'Setze…' : 'Setzen'}
              </button>
            </div>

            {msg && (
              <p style={{ color: msg.includes('erfolgreich') ? '#4CAF50' : '#f44336', marginTop: 10, textAlign: 'center', fontWeight: 'bold' }}>
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

export default ResetPassword;
