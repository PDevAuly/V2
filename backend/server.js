// backend/server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

/* ===================== CORS & JSON ===================== */
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const isProd = process.env.NODE_ENV === 'production';
const corsOptions = isProd
  ? { origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : false, credentials: true }
  : { origin: true, credentials: true }; // dev: alle Origins

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

/* ===================== DB Connection ===================== */
const dbConfig = {
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'db',
  database: process.env.PGDATABASE || 'postgres',
  password: process.env.PGPASSWORD || 'pauly2026!',
  port: Number(process.env.PGPORT || 5432),
};
const pool = new Pool(dbConfig);

pool.connect((err, client, release) => {
  console.log('🚀 Server läuft auf http://localhost:5000');
  console.log('🌐 CORS aktiv für:', isProd ? (ALLOWED_ORIGINS.join(', ') || '(none)') : 'ALLE (dev)');
  console.log('📊 Health Check: http://localhost:5000/api/health');
  console.log('🔧 Mode:', process.env.NODE_ENV || 'development');
  console.log('🗄️  DB Config:', { ...dbConfig, password: '***' });

  if (err) {
    console.error('❌ DB-Verbindung fehlgeschlagen:', err.message);
  } else {
    console.log('✅ DB verbunden:', client.database, '@', dbConfig.host + ':' + dbConfig.port);
    release();
  }
});

/* ===================== E-Mail Konfiguration ===================== */
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'deine-email@gmail.com',
    pass: process.env.SMTP_PASS || 'dein-app-passwort'
  }
};

const transporter = nodemailer.createTransport(emailConfig);

/* ===================== Helpers ===================== */
const toNumberOrNull = (v) =>
  v === '' || v === undefined || v === null ? null : Number(v);

const normalizeJSONB = (val) => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return { text: val }; }
  }
  return { value: val };
};

// Funktion: Vollständige Onboarding-Daten abrufen
const getFullOnboardingData = async (onboardingId) => {
  try {
    // Hauptdaten
    const mainQuery = await pool.query(`
      SELECT 
        o.*,
        c.firmenname, c.email as kunde_email, c.strasse, c.hausnummer, 
        c.plz, c.ort, c.telefonnummer as kunde_telefon,
        cc.vorname as ansprechpartner_vorname, cc.name as ansprechpartner_name,
        cc.position, cc.email as ansprechpartner_email, cc.telefonnummer as ansprechpartner_telefon
      FROM onboarding o
      LEFT JOIN customers c ON o.kunden_id = c.kunden_id
      LEFT JOIN customer_contacts cc ON c.kunden_id = cc.kunden_id
      WHERE o.onboarding_id = $1
    `, [onboardingId]);

    if (!mainQuery.rows.length) {
      throw new Error('Onboarding nicht gefunden');
    }

    const main = mainQuery.rows[0];
    
    // Netzwerk-Daten
    const netzwerk = await pool.query(
      'SELECT * FROM onboarding_netzwerk WHERE onboarding_id = $1',
      [onboardingId]
    );

    // Hardware-Daten
    const hardware = await pool.query(
      'SELECT * FROM onboarding_hardware WHERE onboarding_id = $1',
      [onboardingId]
    );

    // Mail-Daten
    const mail = await pool.query(
      'SELECT * FROM onboarding_mail WHERE onboarding_id = $1',
      [onboardingId]
    );

    // Software-Daten mit Requirements und Apps
    const software = await pool.query(
      'SELECT * FROM onboarding_software WHERE onboarding_id = $1',
      [onboardingId]
    );

    let softwareData = null;
    if (software.rows.length) {
      const requirements = await pool.query(
        'SELECT type, detail FROM onboarding_software_requirements WHERE software_id = $1',
        [software.rows[0].software_id]
      );

      const apps = await pool.query(
        'SELECT name FROM onboarding_software_apps WHERE software_id = $1',
        [software.rows[0].software_id]
      );

      softwareData = {
        ...software.rows[0],
        requirements: requirements.rows,
        apps: apps.rows.map(app => app.name)
      };
    }

    // Backup-Daten
    const backup = await pool.query(
      'SELECT * FROM onboarding_backup WHERE onboarding_id = $1',
      [onboardingId]
    );

    // Sonstiges
    const sonstiges = await pool.query(
      'SELECT * FROM onboarding_sonstiges WHERE onboarding_id = $1',
      [onboardingId]
    );

    // Zusammenfassen
    return {
      onboarding_info: {
        id: main.onboarding_id,
        datum: main.created_at,
        bearbeiter: 'System'
      },
      kunde: {
        firmenname: main.firmenname,
        adresse: {
          strasse: main.strasse,
          hausnummer: main.hausnummer,
          plz: main.plz,
          ort: main.ort
        },
        kontakt: {
          email: main.kunde_email,
          telefon: main.kunde_telefon
        },
        ansprechpartner: {
          name: `${main.ansprechpartner_vorname || ''} ${main.ansprechpartner_name || ''}`.trim(),
          position: main.position,
          email: main.ansprechpartner_email,
          telefon: main.ansprechpartner_telefon
        }
      },
      it_infrastruktur: {
        netzwerk: netzwerk.rows[0] || null,
        hardware: hardware.rows || [],
        mail: mail.rows[0] || null,
        software: softwareData,
        backup: backup.rows[0] || null,
        sonstiges: sonstiges.rows.map(s => s.text) || []
      },
      export_datum: new Date().toISOString()
    };

  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Onboarding-Daten: ${error.message}`);
  }
};

/* ===================== Health / Test ===================== */
app.get('/api/health', async (req, res) => {
  try {
    const r = await pool.query('SELECT NOW() as now');
    res.status(200).json({
      ok: true,
      message: 'Backend OK',
      db: 'connected',
      now: r.rows[0].now,
      env: process.env.NODE_ENV || 'development',
    });
  } catch {
    res.status(200).json({
      ok: true,
      message: 'Backend OK',
      db: 'disconnected',
      env: process.env.NODE_ENV || 'development',
    });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend läuft!', timestamp: new Date().toISOString() });
});

/* ===================== Auth (simple) ===================== */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, passwort } = req.body;
    const r = await pool.query(
      'SELECT mitarbeiter_id, name, vorname, email, rolle, passwort FROM mitarbeiter WHERE email=$1',
      [email]
    );
    if (!r.rows.length) return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    const u = r.rows[0];
    if (u.passwort !== passwort) return res.status(401).json({ error: 'Falsches Passwort' });

    res.json({
      message: 'Login erfolgreich',
      user: { id: u.mitarbeiter_id, name: u.name, vorname: u.vorname, email: u.email, rolle: u.rolle },
    });
  } catch (e) {
    console.error('Login Error:', e);
    res.status(500).json({ error: 'Fehler beim Login' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { vorname, nachname, email, passwort } = req.body;
    const exists = await pool.query('SELECT mitarbeiter_id FROM mitarbeiter WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(400).json({ error: 'Benutzer existiert bereits' });

    const r = await pool.query(
      `INSERT INTO mitarbeiter (name, vorname, email, passwort, telefonnummer, rolle)
       VALUES ($1,$2,$3,$4,'','aussendienst')
       RETURNING mitarbeiter_id, name, vorname, email, rolle`,
      [nachname, vorname, email, passwort]
    );
    res.status(201).json({ message: 'Registrierung erfolgreich', user: r.rows[0] });
  } catch (e) {
    console.error('Register Error:', e);
    res.status(500).json({ error: 'Fehler bei der Registrierung' });
  }
});

/* ===================== Customers ===================== */
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT cc.kontakt_id)   AS ansprechpartner_count,
        COUNT(DISTINCT o.onboarding_id) AS onboarding_count
      FROM customers c
      LEFT JOIN customer_contacts cc ON cc.kunden_id = c.kunden_id
      LEFT JOIN onboarding o         ON o.kunden_id = c.kunden_id
      GROUP BY c.kunden_id
      ORDER BY c.kunden_id DESC
    `);
    res.json(result.rows);
  } catch (e) {
    console.error('Customers Error:', e);
    res.status(500).json({ error: 'Fehler beim Abrufen der Kunden' });
  }
});

app.post('/api/customers', async (req, res) => {
  const client = await pool.connect();
  try {
    const { firmenname, strasse, hausnummer, ort, plz, telefonnummer, email, ansprechpartner } = req.body;

    if (!firmenname || !email) {
      return res.status(400).json({ error: 'Firmenname und E-Mail sind Pflichtfelder' });
    }

    await client.query('BEGIN');

    const dupe = await client.query(
      'SELECT kunden_id FROM customers WHERE email=$1 OR firmenname=$2',
      [email, firmenname]
    );
    if (dupe.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Kunde existiert bereits' });
    }

    const c = await client.query(
      `INSERT INTO customers (firmenname, strasse, hausnummer, ort, plz, telefonnummer, email)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [firmenname, strasse, hausnummer, ort, plz, telefonnummer, email]
    );

    if (ansprechpartner?.name || ansprechpartner?.vorname || ansprechpartner?.email) {
      await client.query(
        `INSERT INTO customer_contacts (kunden_id, vorname, name, position, email, telefonnummer)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          c.rows[0].kunden_id,
          ansprechpartner?.vorname || null,
          ansprechpartner?.name || null,
          ansprechpartner?.position || null,
          ansprechpartner?.email || email,
          ansprechpartner?.telefonnummer || telefonnummer || null,
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Kunde erstellt', kunde: c.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Create customer error:', e);
    res.status(500).json({ error: 'Fehler beim Erstellen des Kunden' });
  } finally {
    client.release();
  }
});

/* ===================== Kalkulationen ===================== */
app.get('/api/kalkulationen', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        k.kalkulations_id,
        k.datum,
        k.status,
        k.stundensatz::float8 AS stundensatz,
        k.gesamtzeit::float8  AS gesamtzeit,
        k.gesamtpreis::float8 AS gesamtpreis,
        k.mwst_prozent::float8 AS mwst_prozent,
        c.firmenname          AS kunde_name
      FROM kalkulationen k
      LEFT JOIN customers c ON c.kunden_id = k.kunden_id
      ORDER BY k.datum DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (e) {
    console.error('GET /api/kalkulationen error:', e);
    res.status(500).json({ error: 'Fehler beim Abrufen der Kalkulationen' });
  }
});

app.post('/api/kalkulationen', async (req, res) => {
  const client = await pool.connect();
  try {
    const { kunde_id, stundensatz, dienstleistungen, mwst_prozent, mitarbeiter_id } = req.body;

    if (!kunde_id || stundensatz === undefined || !Array.isArray(dienstleistungen)) {
      return res.status(400).json({ error: 'kunde_id, stundensatz und dienstleistungen sind erforderlich' });
    }

    let gesamtzeit = 0;
    let gesamtpreis = 0;
    for (const d of dienstleistungen) {
      const dauer = Number(d?.dauer_pro_einheit) || 0;
      const anzahl = Number(d?.anzahl) || 1;
      const stunden = dauer * anzahl;
      const satz = (d?.stundensatz ?? '') === '' || d?.stundensatz === null
        ? Number(stundensatz) || 0
        : Number(d.stundensatz) || 0;

      gesamtzeit  += stunden;
      gesamtpreis += stunden * satz;
    }

    await client.query('BEGIN');

    const k = await client.query(
      `INSERT INTO kalkulationen (kunden_id, datum, stundensatz, mwst_prozent, gesamtzeit, gesamtpreis, status)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, 'neu')
       RETURNING kalkulations_id, datum, stundensatz::float8 AS stundensatz, mwst_prozent::float8 AS mwst_prozent,
                 gesamtzeit::float8 AS gesamtzeit, gesamtpreis::float8 AS gesamtpreis, status`,
      [
        kunde_id,
        Number(stundensatz) || 0,
        mwst_prozent === undefined ? 19 : Number(mwst_prozent),
        gesamtzeit,
        gesamtpreis,
      ]
    );

    const kalkulationsId = k.rows[0].kalkulations_id;

    for (const d of dienstleistungen) {
      await client.query(
        `INSERT INTO kalkulation_positionen (kalkulations_id, section, beschreibung, anzahl, dauer_pro_einheit, stundensatz, info)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          kalkulationsId,
          d.section || null,
          d.beschreibung || '',
          toNumberOrNull(d.anzahl) ?? 1,
          toNumberOrNull(d.dauer_pro_einheit) ?? 0,
          d.stundensatz === '' || d.stundensatz === undefined || d.stundensatz === null ? null : Number(d.stundensatz),
          d.info || null,
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Kalkulation gespeichert', kalkulation: k.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('POST /api/kalkulationen error:', e);
    res.status(500).json({ error: 'Fehler beim Erstellen der Kalkulation: ' + e.message });
  } finally {
    client.release();
  }
});

app.get('/api/kalkulationen/stats', async (req, res) => {
  try {
    const [kundenCount, aktiveOnb, monatsStunden, monatsUmsatz] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM customers'),
      pool.query('SELECT COUNT(*) FROM onboarding'),
      pool.query(`
        SELECT COALESCE(SUM(gesamtzeit),0)::float8 AS total_hours
        FROM kalkulationen 
        WHERE date_trunc('month', datum) = date_trunc('month', CURRENT_DATE)
      `),
      pool.query(`
        SELECT COALESCE(SUM(gesamtpreis),0)::float8 AS total_revenue
        FROM kalkulationen 
        WHERE date_trunc('month', datum) = date_trunc('month', CURRENT_DATE)
          AND status = 'erledigt'
      `),
    ]);

    res.json({
      activeCustomers: Number(kundenCount.rows[0].count || 0),
      runningProjects: Number(aktiveOnb.rows[0].count || 0),
      monthlyHours: Number(monatsStunden.rows[0].total_hours || 0),
      monthlyRevenue: Number(monatsUmsatz.rows[0].total_revenue || 0),
    });
  } catch (e) {
    console.error('GET /api/kalkulationen/stats error:', e);
    res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
  }
});

/* ===================== Onboarding ===================== */
app.post('/api/onboarding', async (req, res) => {
  const client = await pool.connect();
  try {
    const { kunde_id, infrastructure_data, mitarbeiter_id } = req.body;
    if (!kunde_id || !infrastructure_data) {
      return res.status(400).json({ error: 'kunde_id und infrastructure_data sind erforderlich' });
    }

    await client.query('BEGIN');

    const ob = await client.query(
      `INSERT INTO onboarding (kunden_id)
       VALUES ($1)
       RETURNING onboarding_id`,
      [kunde_id]
    );
    const onboardingId = ob.rows[0].onboarding_id;

    if (infrastructure_data.netzwerk) {
      const n = infrastructure_data.netzwerk;
      await client.query(
        `INSERT INTO onboarding_netzwerk
           (onboarding_id, internetzugangsart, firewall_modell, feste_ip_vorhanden,
            ip_adresse, vpn_einwahl_erforderlich, aktuelle_vpn_user, geplante_vpn_user, informationen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          onboardingId,
          n.internetzugangsart || null,
          n.firewall_modell || null,
          !!n.feste_ip_vorhanden,
          n.ip_adresse || null,
          !!n.vpn_einwahl_erforderlich,
          toNumberOrNull(n.aktuelle_vpn_user),
          toNumberOrNull(n.geplante_vpn_user),
          n.informationen || null,
        ]
      );
    }

    const hwList = Array.isArray(infrastructure_data.hardware?.hardwareList)
      ? infrastructure_data.hardware.hardwareList
      : (infrastructure_data.hardware &&
         (infrastructure_data.hardware.typ ||
          infrastructure_data.hardware.hersteller ||
          infrastructure_data.hardware.modell ||
          infrastructure_data.hardware.seriennummer ||
          infrastructure_data.hardware.standort ||
          infrastructure_data.hardware.ip ||
          (infrastructure_data.hardware.details_jsonb &&
           Object.keys(infrastructure_data.hardware.details_jsonb).length) ||
          infrastructure_data.hardware.informationen))
        ? [infrastructure_data.hardware]
        : [];

    for (const hw of hwList) {
      await client.query(
        `INSERT INTO onboarding_hardware
           (onboarding_id, typ, hersteller, modell, seriennummer, standort, ip, details_jsonb, informationen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          onboardingId,
          hw.typ || null,
          hw.hersteller || null,
          hw.modell || null,
          hw.seriennummer || null,
          hw.standort || null,
          hw.ip || null,
          JSON.stringify(normalizeJSONB(hw.details_jsonb)),
          hw.informationen || null,
        ]
      );
    }

    if (infrastructure_data.mail) {
      const m = infrastructure_data.mail;
      await client.query(
        `INSERT INTO onboarding_mail
           (onboarding_id, anbieter, anzahl_postfach, anzahl_shared, gesamt_speicher,
            pop3_connector, mobiler_zugriff, informationen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          onboardingId,
          m.anbieter || null,
          toNumberOrNull(m.anzahl_postfach),
          toNumberOrNull(m.anzahl_shared),
          toNumberOrNull(m.gesamt_speicher),
          !!m.pop3_connector,
          !!m.mobiler_zugriff,
          m.informationen || null,
        ]
      );
    }

    if (infrastructure_data.software) {
      const s = infrastructure_data.software;
      const sw = await client.query(
        `INSERT INTO onboarding_software
           (onboarding_id, name, licenses, critical, description, virenschutz, schnittstellen,
            wartungsvertrag, migration_support, verwendete_applikationen_text)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING software_id`,
        [
          onboardingId,
          s.name || null,
          toNumberOrNull(s.licenses),
          s.critical || null,
          s.description || null,
          s.virenschutz || null,
          s.schnittstellen || null,
          s.wartungsvertrag === true,
          s.migration_support === true,
          s.verwendete_applikationen_text || null,
        ]
      );
      const softwareId = sw.rows[0].software_id;

      if (Array.isArray(s.requirements)) {
        for (const r of s.requirements) {
          await client.query(
            `INSERT INTO onboarding_software_requirements (software_id, type, detail)
             VALUES ($1,$2,$3)`,
            [softwareId, r?.type || null, r?.detail || null]
          );
        }
      }

      const apps = Array.isArray(s.verwendete_applikationen) && s.verwendete_applikationen.length
        ? s.verwendete_applikationen
        : (s.verwendete_applikationen_text || '').split('\n').map(x => x.trim()).filter(Boolean);

      for (const appName of apps) {
        await client.query(
          `INSERT INTO onboarding_software_apps (software_id, name)
           VALUES ($1,$2)`,
          [softwareId, appName]
        );
      }
    }

    if (infrastructure_data.backup) {
      const b = infrastructure_data.backup;
      await client.query(
        `INSERT INTO onboarding_backup
           (onboarding_id, tool, interval, retention, location, size, info)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          onboardingId,
          b.tool || null,
          b.interval || null,
          b.retention || null,
          b.location || null,
          toNumberOrNull(b.size),
          b.info || null,
        ]
      );
    }

    if (infrastructure_data.sonstiges?.text) {
      await client.query(
        `INSERT INTO onboarding_sonstiges (onboarding_id, text)
         VALUES ($1,$2)`,
        [onboardingId, infrastructure_data.sonstiges.text]
      );
    }

    await client.query('COMMIT');
    
    // OPTIONAL: Automatischer E-Mail-Versand
    if (process.env.AUTO_SEND_EMAIL === 'true') {
      try {
        const defaultEmails = (process.env.DEFAULT_RECIPIENTS || '').split(',').filter(Boolean);
        if (defaultEmails.length) {
          // Kundendaten für E-Mail holen
          const customerData = await pool.query(
            'SELECT firmenname FROM customers WHERE kunden_id = $1',
            [kunde_id]
          );
          
          if (customerData.rows.length) {
            // Kurz warten, dann E-Mail senden
            setTimeout(async () => {
              try {
                const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/onboarding/${onboardingId}/send-email`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email_addresses: defaultEmails,
                    subject: `Neues Onboarding abgeschlossen: ${customerData.rows[0].firmenname}`,
                    message: 'Ein neues Kunden-Onboarding wurde soeben abgeschlossen.'
                  })
                });
                console.log('Auto-E-Mail versendet');
              } catch (emailError) {
                console.error('Auto-E-Mail Fehler:', emailError);
              }
            }, 2000);
          }
        }
      } catch (error) {
        console.warn('Auto-E-Mail Setup Fehler:', error);
      }
    }

    res.status(201).json({ message: 'Onboarding gespeichert', onboarding_id: onboardingId });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Onboarding Error:', e);
    res.status(500).json({ error: 'Fehler beim Speichern des Onboardings: ' + e.message });
  } finally {
    client.release();
  }
});

// API-Endpoint: JSON generieren und per E-Mail senden
app.post('/api/onboarding/:id/send-email', async (req, res) => {
  try {
    const onboardingId = parseInt(req.params.id);
    const { email_addresses, subject, message } = req.body;

    if (!email_addresses || !Array.isArray(email_addresses)) {
      return res.status(400).json({ error: 'E-Mail-Adressen sind erforderlich' });
    }

    // Onboarding-Daten abrufen
    const onboardingData = await getFullOnboardingData(onboardingId);
    
    // JSON-Datei erstellen
    const jsonContent = JSON.stringify(onboardingData, null, 2);
    const fileName = `onboarding_${onboardingData.kunde.firmenname.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;

    // E-Mail senden
    const mailOptions = {
      from: process.env.SMTP_FROM || emailConfig.auth.user,
      to: email_addresses.join(', '),
      subject: subject || `Onboarding-Daten: ${onboardingData.kunde.firmenname}`,
      html: `
        <h2>Onboarding-Daten für ${onboardingData.kunde.firmenname}</h2>
        
        ${message ? `<p>${message}</p>` : ''}
        
        <h3>Zusammenfassung:</h3>
        <ul>
          <li><strong>Kunde:</strong> ${onboardingData.kunde.firmenname}</li>
          <li><strong>Bearbeitet am:</strong> ${new Date(onboardingData.onboarding_info.datum).toLocaleDateString('de-DE')}</li>
          <li><strong>Hardware-Komponenten:</strong> ${onboardingData.it_infrastruktur.hardware.length}</li>
          <li><strong>Software erfasst:</strong> ${onboardingData.it_infrastruktur.software ? 'Ja' : 'Nein'}</li>
        </ul>
        
        <p>Die vollständigen Daten finden Sie im Anhang als JSON-Datei.</p>
        
        <hr>
        <p><em>Automatisch generiert durch das Pauly Dashboard</em></p>
      `,
      attachments: [
        {
          filename: fileName,
          content: jsonContent,
          contentType: 'application/json'
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      message: 'E-Mail erfolgreich versendet',
      recipients: email_addresses,
      filename: fileName
    });

  } catch (error) {
    console.error('E-Mail Versand Fehler:', error);
    res.status(500).json({ error: `Fehler beim E-Mail-Versand: ${error.message}` });
  }
});

// API-Endpoint: Nur JSON herunterladen
app.get('/api/onboarding/:id/export', async (req, res) => {
  try {
    const onboardingId = parseInt(req.params.id);
    const onboardingData = await getFullOnboardingData(onboardingId);
    
    const fileName = `onboarding_${onboardingData.kunde.firmenname.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(JSON.stringify(onboardingData, null, 2));

  } catch (error) {
    console.error('Export Fehler:', error);
    res.status(500).json({ error: `Fehler beim Export: ${error.message}` });
  }
});

/* ===================== 404 ===================== */
app.use('*', (req, res) => {
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
      '/api/onboarding/:id/send-email',
      '/api/onboarding/:id/export'
    ],
  });
});

/* ===================== Start ===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${PORT}`);
});