// backend/server.js - API passend zum Dashboard (mit Health, Zahlen-Casts, sauberem CORS)
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

/* ===================== Middleware ===================== */
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Dev: alles erlauben, Prod: nur definierte Origins
app.use(
  cors(
    ALLOWED_ORIGINS.length
      ? { origin: ALLOWED_ORIGINS, credentials: true }
      : undefined
  )
);
app.use(express.json({ limit: '1mb' }));

/* ===================== DB Connection ===================== */
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'db',
  database: process.env.PGDATABASE || 'postgres',
  password: process.env.PGPASSWORD || 'pauly2026!',
  port: process.env.PGPORT || 5432,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Datenbankverbindung fehlgeschlagen:', err.stack);
    console.log('🔍 DB Config:', {
      user: process.env.PGUSER || 'postgres',
      host: process.env.PGHOST || 'db',
      database: process.env.PGDATABASE || 'postgres',
      port: process.env.PGPORT || 5432,
    });
  } else {
    console.log('✅ Datenbank erfolgreich verbunden');
    console.log('📊 Connected to database:', client.database);
    release();
  }
});

/* ===================== Health / Test ===================== */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Backend OK',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend läuft!',
    timestamp: new Date().toISOString(),
    environment: 'docker',
  });
});

/* ===================== Auth ===================== */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, passwort } = req.body;
    const result = await pool.query(
      'SELECT mitarbeiter_id, name, vorname, email, rolle FROM mitarbeiter WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    }

    // TODO: bcrypt.compare(passwort, hash)
    const user = result.rows[0];
    console.log('🔑 Login:', email);

    res.json({
      message: 'Login erfolgreich',
      user: {
        id: user.mitarbeiter_id,
        name: user.name,
        vorname: user.vorname,
        email: user.email,
        rolle: user.rolle,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Fehler beim Login' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { vorname, nachname, email, passwort } = req.body;

    const existingUser = await pool.query(
      'SELECT mitarbeiter_id FROM mitarbeiter WHERE email = $1',
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Benutzer existiert bereits' });
    }

    // TODO: const hashedPassword = await bcrypt.hash(passwort, 10);
    const hashedPassword = passwort;

    const result = await pool.query(
      `
      INSERT INTO mitarbeiter (name, vorname, email, passwort, telefonnummer, rolle)
      VALUES ($1, $2, $3, $4, '', 'aussendienst')
      RETURNING mitarbeiter_id, name, vorname, email, rolle
      `,
      [nachname, vorname, email, hashedPassword]
    );

    res.status(201).json({
      message: 'Registrierung erfolgreich',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ error: 'Fehler bei der Registrierung' });
  }
});

/* ===================== Customers ===================== */
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        k.*,
        COUNT(DISTINCT a.ansprechpartner_id) AS ansprechpartner_count,
        COUNT(DISTINCT o.onboarding_id)     AS onboarding_count
      FROM kunde k
      LEFT JOIN ansprechpartner a ON k.kunden_id = a.kunde_id
      LEFT JOIN onboarding o     ON k.kunden_id = o.kunde_id
      GROUP BY k.kunden_id
      ORDER BY k.kunden_id DESC
    `);

    console.log(`📊 ${result.rows.length} Kunden gefunden`);
    res.json(result.rows);
  } catch (error) {
    console.error('Customers Error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Kunden' });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { firmenname, strasse, hausnummer, ort, plz, telefonnummer, email, ansprechpartner } = req.body;

    if (!firmenname || !strasse || !hausnummer || !ort || !plz || !telefonnummer || !email) {
      return res.status(400).json({ error: 'Alle Pflichtfelder müssen ausgefüllt werden' });
    }

    const existingCustomer = await pool.query(
      'SELECT kunden_id FROM kunde WHERE email = $1 OR firmenname = $2',
      [email, firmenname]
    );
    if (existingCustomer.rows.length > 0) {
      return res.status(400).json({ error: 'Kunde mit dieser E-Mail oder Firma existiert bereits' });
    }

    await pool.query('BEGIN');
    try {
      const kundeResult = await pool.query(
        `
        INSERT INTO kunde (firmenname, strasse, hausnummer, ort, plz, telefonnummer, email)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [firmenname, strasse, hausnummer, ort, plz, telefonnummer, email]
      );
      const neuerKunde = kundeResult.rows[0];
      console.log('✅ Kunde erstellt:', firmenname);

      if (ansprechpartner && ansprechpartner.name && ansprechpartner.vorname) {
        await pool.query(
          `
          INSERT INTO ansprechpartner (name, vorname, telefonnummer, email, position, kunde_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            ansprechpartner.name,
            ansprechpartner.vorname,
            ansprechpartner.telefonnummer || telefonnummer,
            ansprechpartner.email || email,
            ansprechpartner.position || 'Hauptansprechpartner',
            neuerKunde.kunden_id,
          ]
        );
        console.log('✅ Ansprechpartner hinzugefügt');
      }

      await pool.query('COMMIT');
      res.status(201).json({ message: 'Kunde erfolgreich erstellt', kunde: neuerKunde });
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Kunden: ' + error.message });
  }
});

/* ===================== Kalkulationen ===================== */

// Stats, exakt wie vom Dashboard erwartet: activeCustomers, runningProjects, monthlyHours, monthlyRevenue
app.get('/api/kalkulationen/stats', async (req, res) => {
  try {
    const [kundenCount, aktiveProjekte, monatsStunden, monatsUmsatz] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM kunde'),
      pool.query("SELECT COUNT(*) FROM onboarding WHERE status IN (\'neu\', \'in Arbeit\')"),
      pool.query(`
        SELECT COALESCE(SUM(gesamtzeit), 0) AS total_hours
        FROM kalkulation 
        WHERE EXTRACT(MONTH FROM datum) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM datum)  = EXTRACT(YEAR FROM CURRENT_DATE)
      `),
      pool.query(`
        SELECT COALESCE(SUM(gesamtpreis), 0) AS total_revenue
        FROM kalkulation 
        WHERE EXTRACT(MONTH FROM datum) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM datum)  = EXTRACT(YEAR FROM CURRENT_DATE)
          AND status = 'erledigt'
      `),
    ]);

    const stats = {
      activeCustomers: parseInt(kundenCount.rows[0].count, 10),
      runningProjects: parseInt(aktiveProjekte.rows[0].count, 10),
      monthlyHours: parseFloat(monatsStunden.rows[0].total_hours || 0),
      monthlyRevenue: parseFloat(monatsUmsatz.rows[0].total_revenue || 0),
    };

    console.log('📊 Stats abgerufen:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
  }
});

// Liste der Kalkulationen mit Feldern exakt wie im Frontend genutzt.
// WICHTIG: numerische Felder als float casten, damit im FE keine Strings ankommen.
app.get('/api/kalkulationen', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        k.kalkulations_id,
        k.datum,
        k.status,
        k.stundensatz::float8   AS stundensatz,
        k.gesamtzeit::float8    AS gesamtzeit,
        k.gesamtpreis::float8   AS gesamtpreis,
        ku.firmenname           AS kunde_name,
        m.name                  AS mitarbeiter_name,
        m.vorname               AS mitarbeiter_vorname
      FROM kalkulation k
      JOIN kunde ku         ON k.kunde_id = ku.kunden_id
      LEFT JOIN mitarbeiter m ON k.mitarbeiter_id = m.mitarbeiter_id
      ORDER BY k.datum DESC
      LIMIT 10
    `);

    console.log(`📊 ${result.rows.length} Kalkulationen gefunden`);
    res.json(result.rows);
  } catch (error) {
    console.error('Kalkulationen Error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Kalkulationen' });
  }
});

app.post('/api/kalkulationen', async (req, res) => {
  try {
    const { kunde_id, stundensatz, dienstleistungen, mitarbeiter_id } = req.body;

    if (!kunde_id || !stundensatz || !dienstleistungen || !Array.isArray(dienstleistungen)) {
      return res.status(400).json({ error: 'Kunde, Stundensatz und Dienstleistungen sind erforderlich' });
    }

    // Gesamtzeit berechnen
    let gesamtzeit = 0;
    for (const dienst of dienstleistungen) {
      const dauer = parseFloat(dienst.dauer_pro_einheit) || 0;
      const anzahl = parseInt(dienst.anzahl) || 1;
      gesamtzeit += dauer * anzahl;
    }
    const gesamtpreis = gesamtzeit * parseFloat(stundensatz);

    await pool.query('BEGIN');
    try {
      const calcRes = await pool.query(
        `
        INSERT INTO kalkulation (datum, gesamtpreis, gesamtzeit, stundensatz, status, kunde_id, mitarbeiter_id)
        VALUES (CURRENT_DATE, $1, $2, $3, 'neu', $4, $5)
        RETURNING kalkulations_id, datum, status, stundensatz::float8 AS stundensatz,
                  gesamtzeit::float8 AS gesamtzeit, gesamtpreis::float8 AS gesamtpreis
        `,
        [gesamtpreis, gesamtzeit, stundensatz, kunde_id, mitarbeiter_id || 1]
      );

      const neueKalkulation = calcRes.rows[0];

      for (const dienst of dienstleistungen) {
        const dauer = parseFloat(dienst.dauer_pro_einheit) || 0;
        const anzahl = parseInt(dienst.anzahl) || 1;
        const gesamtdauer = dauer * anzahl;

        await pool.query(
          `
          INSERT INTO dienstleistung (beschreibung, dauer_pro_einheit, anzahl, gesamtdauer, info, kalkulation_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [dienst.beschreibung, dauer, anzahl, gesamtdauer, dienst.info || null, neueKalkulation.kalkulations_id]
        );
      }

      await pool.query('COMMIT');
      console.log('✅ Kalkulation erstellt:', neueKalkulation.kalkulations_id);

      res.status(201).json({
        message: 'Kalkulation erfolgreich erstellt',
        kalkulation: neueKalkulation,
      });
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Error creating kalkulation:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Kalkulation: ' + error.message });
  }
});

/* ===================== 404 ===================== */
app.use('*', (req, res) => {
  console.log('❓ Route nicht gefunden:', req.originalUrl);
  res.status(404).json({
    error: 'Route nicht gefunden: ' + req.originalUrl,
    available_routes: [
      '/api/health',
      '/api/test',
      '/api/auth/login',
      '/api/auth/register',
      '/api/customers',
      '/api/kalkulationen',
      '/api/kalkulationen/stats',
    ],
  });
});

/* ===================== Start ===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server läuft auf Port ${PORT}`);
  console.log(`📡 API verfügbar unter: http://localhost:${PORT}/api`);
  console.log('🐳 Docker-Modus mit echter Datenbank');
});
