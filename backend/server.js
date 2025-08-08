// backend/server.js - OHNE Route-Imports, OHNE DB
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test Route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend läuft!', 
    timestamp: new Date().toISOString()
  });
});

// Mock Routes für Frontend-Test
app.get('/api/customers', (req, res) => {
  res.json([
    { kunden_id: 1, firmenname: 'Test Firma GmbH', email: 'test@firma.de' },
    { kunden_id: 2, firmenname: 'Demo Solutions', email: 'info@demo.de' }
  ]);
});

app.post('/api/customers', (req, res) => {
  console.log('Received:', req.body);
  res.status(201).json({
    message: 'Kunde erfolgreich erstellt (Mock)',
    kunde: req.body
  });
});

app.get('/api/kalkulationen/stats', (req, res) => {
  res.json({
    activeCustomers: 5,
    runningProjects: 3,
    monthlyHours: 120,
    monthlyRevenue: 10500
  });
});

app.get('/api/kalkulationen', (req, res) => {
  res.json([]);
});

app.post('/api/kalkulationen', (req, res) => {
  console.log('Received kalkulation:', req.body);
  res.status(201).json({
    message: 'Kalkulation erfolgreich erstellt (Mock)',
    kalkulation: req.body
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf Port ${PORT}`);
  console.log(`📡 Test: http://localhost:${PORT}/api/test`);
});