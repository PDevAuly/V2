// src/pages/register.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './register.css';
import { fetchJSON } from 'services/api'; // ✅ neu: API-Wrapper

const Register = () => {
  const navigate = useNavigate();
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [passwortBestaetigen, setPasswortBestaetigen] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Passwort-Validierung States
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    special: false,
    match: false
  });
  const [showValidation, setShowValidation] = useState(false);

  // Passwort-Validierung in Echtzeit
  useEffect(() => {
    const validation = {
      length: passwort.length >= 8,
      uppercase: /[A-Z]/.test(passwort),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwort),
      match: passwort === passwortBestaetigen && passwort.length > 0
    };
    
    setPasswordValidation(validation);
    setShowValidation(passwort.length > 0);
  }, [passwort, passwortBestaetigen]);

  const isPasswordValid = () => {
    return passwordValidation.length && 
           passwordValidation.uppercase && 
           passwordValidation.special && 
           passwordValidation.match;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    // Frontend-Validierung
    if (!isPasswordValid()) {
      setMessage('Bitte erfülle alle Passwort-Anforderungen');
      return;
    }

    if (passwort !== passwortBestaetigen) {
      setMessage('Passwörter stimmen nicht überein');
      return;
    }

    setLoading(true);

    try {
      // ✅ statt fetch('/api/...') jetzt fetchJSON (nutzt REACT_APP_API_URL oder '/api')
    await fetchJSON('/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    password: passwort,   // Backend erwartet "password"
    vorname,
    name: nachname        // Backend erwartet "name"
  }),
});


      setMessage('Registrierung erfolgreich!');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Fehler bei der Registrierung');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <header className="logo">
        <img src="/pauly_logo4.png" alt="Pauly Logo" />
      </header>
      <div className="overlay">
        <form onSubmit={handleSubmit}>
          <div className="con">
            <header className="head-form">
              <h2>Registrieren</h2>
              <p>Bitte fülle alle Felder aus, um ein neues Konto zu erstellen</p>
            </header>

            <div className="field-set">
              <input 
                className="form-input" 
                type="text" 
                placeholder="Vorname" 
                value={vorname} 
                onChange={(e) => setVorname(e.target.value)} 
                required 
              />
              
              <input 
                className="form-input" 
                type="text" 
                placeholder="Nachname" 
                value={nachname} 
                onChange={(e) => setNachname(e.target.value)} 
                required 
              />
              
              <input 
                className="form-input" 
                type="email" 
                placeholder="E-Mail" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
              
              <input 
                className={`form-input ${showValidation && !passwordValidation.length ? 'invalid' : showValidation && passwordValidation.length ? 'valid' : ''}`}
                type="password" 
                placeholder="Passwort" 
                value={passwort} 
                onChange={(e) => setPasswort(e.target.value)} 
                required 
              />

              <input 
                className={`form-input ${passwortBestaetigen.length > 0 && !passwordValidation.match ? 'invalid' : passwortBestaetigen.length > 0 && passwordValidation.match ? 'valid' : ''}`}
                type="password" 
                placeholder="Passwort bestätigen" 
                value={passwortBestaetigen} 
                onChange={(e) => setPasswortBestaetigen(e.target.value)} 
                required 
              />

              {/* Passwort-Validierung Anzeige */}
              {showValidation && (
                <div className="password-validation">
                  <div className="validation-title">Passwort-Anforderungen:</div>
                  <div className={`validation-item ${passwordValidation.length ? 'valid' : 'invalid'}`}>
                    {passwordValidation.length ? '✓' : '✗'} Mindestens 8 Zeichen
                  </div>
                  <div className={`validation-item ${passwordValidation.uppercase ? 'valid' : 'invalid'}`}>
                    {passwordValidation.uppercase ? '✓' : '✗'} Ein Großbuchstabe
                  </div>
                  <div className={`validation-item ${passwordValidation.special ? 'valid' : 'invalid'}`}>
                    {passwordValidation.special ? '✓' : '✗'} Ein Sonderzeichen
                  </div>
                  {passwortBestaetigen.length > 0 && (
                    <div className={`validation-item ${passwordValidation.match ? 'valid' : 'invalid'}`}>
                      {passwordValidation.match ? '✓' : '✗'} Passwörter stimmen überein
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit" 
                className="log-in" 
                disabled={loading || !isPasswordValid()}
                style={{
                  opacity: (!isPasswordValid() && showValidation) ? 0.6 : 1,
                  cursor: (!isPasswordValid() && showValidation) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Registriert...' : 'Registrieren'}
              </button>
            </div>

            {message && (
              <p style={{ 
                color: message.includes('erfolgreich') ? '#4CAF50' : '#f44336', 
                marginTop: '10px',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                {message}
              </p>
            )}

            <div className="other">
              <Link to="/login" className="btn submits log-in">
                Zurück zum Login
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
