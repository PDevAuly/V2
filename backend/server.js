// backend/server.js - API passend zur neuen Datenbankstruktur
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
app.use(express.json({ limit: '2mb' }));

/* ===================== DB Connection ===================== */
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'db', // Docker-Service-Name
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
      'SELECT mitarbeiter_id, name, vorname, email, rolle, passwort FROM mitarbeiter WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    }

    const user = result.rows[0];
    
    // PASSWORT-VALIDIERUNG HINZUGEFÜGT:
    if (user.passwort !== passwort) {
      return res.status(401).json({ error: 'Falsches Passwort' });
    }

    console.log('🔑 Login erfolgreich:', email);

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
app.get('/api/kalkulationen/stats', async (req, res) => {
  try {
    const [kundenCount, aktiveProjekte, monatsStunden, monatsUmsatz] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM kunde'),
      pool.query("SELECT COUNT(*) FROM onboarding WHERE status IN ('neu', 'in Arbeit')"),
      pool.query(`
        SELECT COALESCE(SUM(gesamtzeit), 0) AS total_hours
        FROM kalkulation 
        WHERE EXTRACT(MONTH FROM datum) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR  FROM datum) = EXTRACT(YEAR FROM CURRENT_DATE)
      `),
      pool.query(`
        SELECT COALESCE(SUM(gesamtpreis), 0) AS total_revenue
        FROM kalkulation 
        WHERE EXTRACT(MONTH FROM datum) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR  FROM datum) = EXTRACT(YEAR FROM CURRENT_DATE)
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
      JOIN kunde ku           ON k.kunde_id = ku.kunden_id
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

    // Gesamtzeit & -preis berechnen (pro Zeile optionaler Stundensatz)
    let gesamtzeit = 0;
    let gesamtpreis = 0;
    for (const d of dienstleistungen) {
      const dauer = parseFloat(d.dauer_pro_einheit) || 0;
      const anzahl = parseInt(d.anzahl) || 1;
      const stunden = dauer * anzahl;
      const zeilenSatz = (d.stundensatz != null && d.stundensatz !== '') ? Number(d.stundensatz) : Number(stundensatz);
      gesamtzeit  += stunden;
      gesamtpreis += stunden * zeilenSatz;
    }

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

      for (const d of dienstleistungen) {
        const dauer = parseFloat(d.dauer_pro_einheit) || 0;
        const anzahl = parseInt(d.anzahl) || 1;
        const gesamtdauer = dauer * anzahl;
        const zeilenSatz = (d.stundensatz != null && d.stundensatz !== '') ? Number(d.stundensatz) : null;

        await pool.query(
          `
          INSERT INTO dienstleistung (beschreibung, dauer_pro_einheit, anzahl, gesamtdauer, info, kalkulation_id, stundensatz)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [d.beschreibung, dauer, anzahl, gesamtdauer, d.info || null, neueKalkulation.kalkulations_id, zeilenSatz]
        );
      }

      await pool.query('COMMIT');
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

/* ===================== Onboarding (Neue Struktur) ===================== */
app.post('/api/onboarding', async (req, res) => {
  const client = await pool.connect();
  try {
    const { kunde_id, infrastructure_data, mitarbeiter_id } = req.body;
    
    if (!kunde_id || !infrastructure_data) {
      return res.status(400).json({ error: 'kunde_id und infrastructure_data sind erforderlich' });
    }

    console.log('📥 Onboarding-Daten erhalten:', JSON.stringify(infrastructure_data, null, 2));

    await client.query('BEGIN');

    // 1) Onboarding-Eintrag erstellen
    const onboardingResult = await client.query(
      `INSERT INTO onboarding (datum, status, mitarbeiter_id, kunde_id)
       VALUES (CURRENT_DATE, 'neu', $1, $2)
       RETURNING onboarding_id`,
      [mitarbeiter_id || 1, kunde_id]
    );
    
    const onboardingId = onboardingResult.rows[0].onboarding_id;
    console.log('✅ Onboarding erstellt mit ID:', onboardingId);

    // 2) Netzwerk-Daten speichern
    if (infrastructure_data.netzwerk) {
      const netzwerk = infrastructure_data.netzwerk;
      
      try {
        await client.query(
          `INSERT INTO netzwerk (
             onboarding_id, internetzugangsart, feste_ip_vorhanden, 
             vpn_einwahl_erforderlich, aktuelle_vpn_user, geplante_vpn_user
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            onboardingId,
            netzwerk.internetzugangsart || null,
            !!netzwerk.feste_ip_vorhanden,
            !!netzwerk.vpn_einwahl_erforderlich,
            netzwerk.aktuelle_vpn_user ? parseInt(netzwerk.aktuelle_vpn_user) : null,
            netzwerk.geplante_vpn_user ? parseInt(netzwerk.geplante_vpn_user) : null
          ]
        );
        console.log('✅ Netzwerk-Daten gespeichert');
      } catch (error) {
        console.error('❌ Fehler beim Speichern der Netzwerk-Daten:', error);
      }
    }

    // 3) Hardware-Daten speichern
    if (infrastructure_data.hardware) {
      const hardware = infrastructure_data.hardware;
      
      try {
        await client.query(
          `INSERT INTO hardware (
             onboarding_id, typ, details_jsonb, hersteller, modell, 
             seriennummer, standort, ip, informationen
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            onboardingId,
            hardware.typ || null,
            hardware.details_jsonb ? JSON.stringify(hardware.details_jsonb) : null,
            hardware.hersteller || null,
            hardware.modell || null,
            hardware.seriennummer || null,
            hardware.standort || null,
            hardware.ip || null,
            hardware.informationen || null
          ]
        );
        console.log('✅ Hardware-Daten gespeichert');
      } catch (error) {
        console.error('❌ Fehler beim Speichern der Hardware-Daten:', error);
      }
    }

    // 4) Mail-Daten speichern
    if (infrastructure_data.mail) {
      const mail = infrastructure_data.mail;
      
      try {
        await client.query(
          `INSERT INTO mail (
             onboarding_id, anbieter, anzahl_postfach, anzahl_shared, 
             gesamt_speicher, pop3_connector, mobiler_zugriff, informationen
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            onboardingId,
            mail.anbieter || null,
            mail.anzahl_postfach ? parseInt(mail.anzahl_postfach) : null,
            mail.anzahl_shared ? parseInt(mail.anzahl_shared) : null,
            mail.gesamt_speicher ? parseFloat(mail.gesamt_speicher) : null,
            !!mail.pop3_connector,
            !!mail.mobiler_zugriff,
            mail.informationen || null
          ]
        );
        console.log('✅ Mail-Daten gespeichert');
      } catch (error) {
        console.error('❌ Fehler beim Speichern der Mail-Daten:', error);
      }
    }

    // 5) Software-Daten speichern
    if (infrastructure_data.software) {
      const software = infrastructure_data.software;
      
      try {
        await client.query(
          `INSERT INTO software (
             onboarding_id, name, licenses, critical, requirements, 
             description, verwendete_applikationen_text
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            onboardingId,
            software.name || null,
            software.licenses ? parseInt(software.licenses) : null,
            software.critical || null,
            software.requirements ? JSON.stringify(software.requirements) : null,
            software.description || null,
            software.verwendete_applikationen_text || null
          ]
        );
        console.log('✅ Software-Daten gespeichert');
      } catch (error) {
        console.error('❌ Fehler beim Speichern der Software-Daten:', error);
      }
    }

    // 6) Backup-Daten speichern
    if (infrastructure_data.backup) {
      const backup = infrastructure_data.backup;
      
      try {
        await client.query(
          `INSERT INTO backup (
             onboarding_id, tool, interval_backup, retention, 
             location, size_gb, info
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            onboardingId,
            backup.tool || null,
            backup.interval || null,
            backup.retention || null,
            backup.location || null,
            backup.size ? parseFloat(backup.size) : null,
            backup.info || null
          ]
        );
        console.log('✅ Backup-Daten gespeichert');
      } catch (error) {
        console.error('❌ Fehler beim Speichern der Backup-Daten:', error);
      }
    }

    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Onboarding erfolgreich gespeichert',
      onboarding_id: onboardingId
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Onboarding Fatal Error:', error);
    res.status(500).json({ 
      error: 'Fehler beim Speichern des Onboardings: ' + error.message 
    });
  } finally {
    client.release();
  }
});

/* ===================== 404 ===================== */
app.use('*', (req, res) => {
  console.log('Route nicht gefunden:', req.originalUrl);
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
      '/api/onboarding',
    ],
  });
});

/* ===================== Start ===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${PORT}`);
  console.log(`API verfügbar unter: http://localhost:${PORT}/api`);
  console.log('Docker-Modus mit echter Datenbank');
});