import React, { useState } from 'react';
import Login from './components/login';
import Register from './components/register';
import Dashboard from './components/dashboard';

import './components/login.css';
import './components/register.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const handleSwitch = () => setShowRegister((prev) => !prev);
  const handleLoginSuccess = () => setIsLoggedIn(true);

  if (isLoggedIn) return <Dashboard />;

  return showRegister ? (
    <Register onSwitch={handleSwitch} />
  ) : (
    <Login onSwitch={handleSwitch} onLoginSuccess={handleLoginSuccess} />
  );
}

export default App;
