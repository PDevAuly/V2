// src/pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import './login.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Token-Validierung
  const [tokenValid, setTokenValid] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Kein Reset-Token gefunden');
      setTokenValid(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch('/api/auth/validate-reset-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await res.json();

        if (res.ok) {
          setTokenValid(true);
          setUserEmail(data.email);
        } else {
          setTokenValid(false);
          setError(data.error || 'Ungültiger oder abgelaufener Reset-Token');
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setTokenValid(false);
        setError('Fehler bei der Token-Validierung');
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validierung
    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Fehler beim Zurücksetzen des Passworts');
        return;
      }

      setSuccess(true);
      
      // Nach 3 Sekunden zum Login weiterleiten
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('Reset password error:', err);
      setError('Serverfehler – bitte später erneut versuchen');
    } finally {
      setLoading(false);
    }
  };

  // Loading state während Token-Validierung
  if (tokenValid === null) {
    return (
      <div className="login-page">
        <header className="logo">
          <img src="/pauly_logo4.png" alt="Pauly Logo" />
        </header>
        <div className="overlay">
          <div className="con">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Token wird validiert...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Token ungültig
  if (tokenValid === false) {
    return (
      <div className="login-page">
        <header className="logo">
          <img src="/pauly_logo4.png" alt="Pauly Logo" />
        </header>
        <div className="overlay">
          <div className="con">
            <header className="head-form">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <XCircle style={{ width: '48px', height: '48px', color: '#dc2626', margin: '0 auto 16px' }} />
              </div>
              <h2>Ungültiger Link</h2>
              <p>Dieser Reset-Link ist ungültig oder abgelaufen.</p>
            </header>
            <div className="field-set">
              <button 
                onClick={() => navigate('/forgot-password')} 
                className="log-in"
              >
                Neuen Reset-Link anfordern
              </button>
              <button 
                onClick={() => navigate('/login')} 
                className="btn submits sign-up"
                style={{ marginTop: 10 }}
              >
                Zurück zum Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Erfolgreich zurückgesetzt
  if (success) {
    return (
      <div className="login-page">
        <header className="logo">
          <img src="/pauly_logo4.png" alt="Pauly Logo" />
        </header>
        <div className="overlay">
          <div className="con">
            <header className="head-form">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <CheckCircle style={{ width: '48px', height: '48px', color: '#16a34a', margin: '0 auto 16px' }} />
              </div>
              <h2>Passwort zurückgesetzt</h2>
              <p>Ihr Passwort wurde erfolgreich zurückgesetzt.</p>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Sie werden in Kürze zum Login weitergeleitet...
              </p>
            </header>
            <div className="field-set">
              <button 
                onClick={() => navigate('/login')} 
                className="log-in"
              >
                Jetzt anmelden
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Passwort-Reset Formular
  return (
    <div className="login-page">
      <header className="logo">
        <img src="/pauly_logo4.png" alt="Pauly Logo" />
      </header>

      <div className="overlay">
        <form onSubmit={handleSubmit}>
          <div className="con">
            <header className="head-form">
              <h2>Neues Passwort setzen</h2>
              <p>Erstellen Sie ein neues, sicheres Passwort für Ihr Konto.</p>
              {userEmail && (
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Account: {userEmail}
                </p>
              )}
            </header>

            <div className="field-set">
              {/* Neues Passwort */}
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Neues Passwort (mind. 6 Zeichen)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                  style={{ paddingRight: '50px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Passwort bestätigen */}
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Passwort bestätigen"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{ paddingRight: '50px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Passwort-Stärke Hinweise */}
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginTop: '10px',
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}>
                <strong>Passwort-Anforderungen:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li style={{ color: password.length >= 6 ? '#16a34a' : '#666' }}>
                    Mindestens 6 Zeichen
                  </li>
                  <li style={{ color: password === confirmPassword && password ? '#16a34a' : '#666' }}>
                    Beide Passwörter müssen übereinstimmen
                  </li>
                </ul>
              </div>

              <button 
                type="submit" 
                className="log-in" 
                disabled={loading || password.length < 6 || password !== confirmPassword}
              >
                {loading ? 'Wird gesetzt…' : 'Passwort setzen'}
              </button>

              {error && <p style={{ color: 'red', marginTop: 10, textAlign: 'center' }}>{error}</p>}
            </div>

            <div className="other">
              <button 
                type="button"
                onClick={() => navigate('/login')} 
                className="btn submits sign-up"
                disabled={loading}
              >
                Zurück zum Login
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;