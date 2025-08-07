// client/src/components/dashboard.jsx
import React from 'react';
import './dashboard.css';

function Dashboard() {
  return (
    <div className="dashboard-container">
      <h1>Willkommen im Dashboard</h1>
      <p>Hier kannst du neue Kunden erfassen und Stunden kalkulieren.</p>

      <div className="dashboard-tools">
        <div className="tool-card">
          <h3>Neukunde erfassen</h3>
          <p>Formular zur Kundenaufnahme</p>
        </div>
        <div className="tool-card">
          <h3>Stundenkalkulation</h3>
          <p>Stunden kalkulieren und speichern</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
