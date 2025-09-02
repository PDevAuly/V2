// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// ✅ Auth-Seiten (relative Pfade)
import Login from './pages/auth/login';
import Register from './pages/auth/register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// ✅ Dashboard & MFA
import Dashboard from './pages/dashboard/Dashboard';
import MFASetup from './pages/components/MFASetup';

// ✅ Auth-CSS
import './pages/auth/login.css';
import './pages/auth/register.css';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) return JSON.parse(raw);

      // Migration älterer Keys
      const legacyUserData = localStorage.getItem('userData');
      const legacyToken = localStorage.getItem('userToken');
      if (legacyUserData) {
        const parsed = JSON.parse(legacyUserData);
        localStorage.setItem('user', JSON.stringify(parsed));
        localStorage.removeItem('userData');
        if (legacyToken) localStorage.removeItem('userToken');
        return parsed;
      }
      if (legacyToken) localStorage.removeItem('userToken');
      return null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  const isAuthenticated = !!user;

  const handleLogin = (userData) => setUser(userData || null);
  const handleLogout = () => setUser(null);
  const handleMFAEnabled = (mfaEnabled) => setUser(prev => ({ ...prev, mfaEnabled }));

  const RequireAuth = ({ children }) =>
    isAuthenticated ? children : <Navigate to="/login" replace />;

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />

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

        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
        />

        <Route
          path="/forgot-password"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />}
        />

        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/dashboard/*"
          element={
            <RequireAuth>
              <Dashboard onLogout={handleLogout} userInfo={user} />
            </RequireAuth>
          }
        />

        <Route
          path="/profile/mfa"
          element={
            <RequireAuth>
              <MFASetup user={user} accessToken={user?.token} onMFAEnabled={handleMFAEnabled} />
            </RequireAuth>
          }
        />

        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
    </Router>
  );
}