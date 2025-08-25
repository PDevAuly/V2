import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './register.css';

const Register = () => {
  const navigate = useNavigate();
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vorname, nachname, email, passwort }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Registrierung erfolgreich!');
        // ✅ React Router Navigation
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setMessage(data.error || 'Fehler bei der Registrierung');
      }
    } catch (err) {
      console.error(err);
      setMessage('Serverfehler. Bitte später versuchen.');
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
                className="form-input" 
                type="password" 
                placeholder="Passwort" 
                value={passwort} 
                onChange={(e) => setPasswort(e.target.value)} 
                required 
              />

              <button type="submit" className="log-in">Registrieren</button>
            </div>

            {message && <p style={{ color: 'white', marginTop: '10px' }}>{message}</p>}

            <div className="other">
              {/* ✅ React Router Link */}
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