import React, { useState } from 'react';
import Login from './components/login';
import Register from './components/register';
import Dashboard from './components/dashboard'; // ← Neu importiert
import './components/login.css';
import './components/register.css';
import './components/dashboard.css'; // ← Neues Stylesheet für das Dashboard

function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // ← Login-Status

  const handleSwitch = () => setShowRegister(prev => !prev);

  const handleLoginSuccess = () => setIsLoggedIn(true); // ← Nach Login

  return (
    <div>
      {isLoggedIn ? (
        <Dashboard />
      ) : showRegister ? (
        <Register onSwitch={handleSwitch} />
      ) : (
        <Login onSwitch={handleSwitch} onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
