// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/login';
import Register from './pages/register';
import Dashboard from './pages/dashboard';
import MFASetup from './components/MFASetup';

import './pages/login.css';
import './pages/register.css';

export default function App() {
  // User aus LocalStorage laden (inkl. Migration alter Keys)
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) return JSON.parse(raw);

      // ---- Migration älterer Versionen ----
      const legacyUserData = localStorage.getItem('userData');
      const legacyToken = localStorage.getItem('userToken');
      if (legacyUserData) {
        const parsed = JSON.parse(legacyUserData);
        // neuen Key setzen und alte entfernen
        localStorage.setItem('user', JSON.stringify(parsed));
        localStorage.removeItem('userData');
        if (legacyToken) localStorage.removeItem('userToken');
        return parsed;
      }
      if (legacyToken) localStorage.removeItem('userToken');
      // -------------------------------------

      return null;
    } catch {
      return null;
    }
  });

  // User-Änderungen im LocalStorage spiegeln
  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  const isAuthenticated = !!user;

  // Login vom <Login /> entgegennehmen
  const handleLogin = (userData) => {
    // Erwartet Objekt wie { id, email, name, vorname, rolle, ... }
    setUser(userData || null);
  };

  // Logout aus <Dashboard />
  const handleLogout = () => {
    setUser(null);
  };

  // MFA Enabled Handler
  const handleMFAEnabled = (mfaEnabled) => {
    setUser(prevUser => ({
      ...prevUser,
      mfaEnabled
    }));
  };

  // Schutz für geschützte Routen
  const RequireAuth = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  };

  return (
    <Router>
      <Routes>
        {/* Root: je nach Zustand weiterleiten */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />

        {/* Login: wenn schon eingeloggt -> Dashboard */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLoginSuccess={handleLogin} />
            )
          }
        />

        {/* Registrierung: ebenfalls gesperrt, wenn eingeloggt */}
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
        />

        {/* Dashboard nur mit Auth, User an Dashboard weiterreichen */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard onLogout={handleLogout} userInfo={user} />
            </RequireAuth>
          }
        />
        
        {/* MFA Setup Route */}
        <Route
          path="/profile/mfa"
          element={
            <RequireAuth>
              <MFASetup 
                user={user} 
                accessToken={user?.token} 
                onMFAEnabled={handleMFAEnabled} 
              />
            </RequireAuth>
          }
        />

        {/* Fallback: alles andere passend umlenken */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
    </Router>
  );
}