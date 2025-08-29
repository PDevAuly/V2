// backend/server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
require('dotenv').config();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

const MFA_ISSUER = process.env.MFA_ISSUER || 'Pauly Dashboard';

const app = express();

/* ===================== CORS & JSON ===================== */
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const isProd = process.env.NODE_ENV === 'production';
const corsOptions = isProd
  ? { origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : false, credentials: true }
  : { origin: true, credentials: true };

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

/* ===================== Middleware für Token-Validierung ===================== */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Ungültiger Access-Token. Bitte loggen Sie sich erneut ein.' });
  }
  
  const token = authHeader.substring(7);
  if (!token || token === 'fwhlwemwldung') {
    return res.status(401).json({ error: 'Ungültiger Access-Token. Bitte loggen Sie sich erneut ein.' });
  }
  
  // TODO: Hier später JWT-Validierung hinzufügen falls gewünscht
  // const decoded = jwt.verify(token, JWT_SECRET);
  // req.user = decoded;
  
  next();
};

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
console.log('E-Mail Config:', {
  host: emailConfig.host,
  port: emailConfig.port,
  user: emailConfig.auth.user,
  pass: emailConfig.auth.pass ? '***GESETZT***' : 'NICHT GESETZT'
});

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

const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
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

function generateBackupCodes(n = 8) {
  const out = [];
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < n; i++) {
    let c = '';
    for (let j = 0; j < 10; j++) c += alphabet[Math.floor(Math.random() * alphabet.length)];
    out.push(c.slice(0,5) + '-' + c.slice(5));
  }
  return out;
}

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

/* ===================== Auth Routes ===================== */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, passwort } = req.body;
    const r = await pool.query(
      'SELECT mitarbeiter_id, name, vorname, email, rolle, passwort, mfa_enabled FROM mitarbeiter WHERE email = $1',
      [email]
    );
    if (!r.rows.length) return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    const u = r.rows[0];
    if (u.passwort !== passwort) return res.status(401).json({ error: 'Falsches Passwort' });

    if (u.mfa_enabled) {
      return res.status(200).json({
        status: 'MFA_REQUIRED',
        user_id: u.mitarbeiter_id,
        email: u.email
      });
    }

    res.json({
      message: 'Login erfolgreich',
      user: {
        id: u.mitarbeiter_id,
        name: u.name,
        vorname: u.vorname,
        email: u.email,
        rolle: u.rolle,
        mfa_enabled: !!u.mfa_enabled
      },
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

app.post('/api/auth/mfa/setup/start', verifyToken, async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id ist erforderlich' });

    const u = await pool.query(
      'SELECT mitarbeiter_id, email FROM mitarbeiter WHERE mitarbeiter_id = $1',
      [user_id]
    );
    if (!u.rows.length) return res.status(404).json({ error: 'Nutzer nicht gefunden' });

    const email = u.rows[0].email;

    const secret = speakeasy.generateSecret({
      length: 20,
      name: `${MFA_ISSUER}:${email}`,
      issuer: MFA_ISSUER
    });

    const otpauth = secret.otpauth_url || speakeasy.otpauthURL({
      secret: secret.base32,
      label: `${MFA_ISSUER}:${email}`,
      issuer: MFA_ISSUER,
      encoding: 'base32'
    });

    const qrDataUrl = await QRCode.toDataURL(otpauth);

    await pool.query(
      'UPDATE mitarbeiter SET mfa_temp_secret=$1 WHERE mitarbeiter_id=$2',
      [secret.base32, user_id]
    );

    res.json({ 
      otpauth, 
      qrDataUrl,
      secret: secret.base32
    });
  } catch (e) {
    console.error('MFA setup start error:', e);
    res.status(500).json({ error: 'Fehler beim Starten des MFA-Setups' });
  }
});

app.post('/api/auth/mfa/setup/verify', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, token } = req.body;
    if (!user_id || !token) return res.status(400).json({ error: 'user_id und token sind erforderlich' });

    const r = await client.query(
      'SELECT mfa_temp_secret FROM mitarbeiter WHERE mitarbeiter_id=$1',
      [user_id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Nutzer nicht gefunden' });

    const tempSecret = r.rows[0].mfa_temp_secret;
    if (!tempSecret) return res.status(400).json({ error: 'Kein temporäres Secret vorhanden' });

    const ok = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: String(token),
      window: 1
    });

    if (!ok) return res.status(400).json({ error: 'Ungültiger Code' });

    const backupCodes = generateBackupCodes();

    await client.query('BEGIN');
    await client.query(
      `UPDATE mitarbeiter
         SET mfa_secret=$1, mfa_temp_secret=NULL, mfa_enabled=true, mfa_enrolled_at=NOW(), mfa_backup_codes=$2
       WHERE mitarbeiter_id=$3`,
      [tempSecret, JSON.stringify(backupCodes), user_id]  // ← FIX: JSON.stringify hinzugefügt
    );
    await client.query('COMMIT');

    res.json({ success: true, backup_codes: backupCodes });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('MFA setup verify error:', e);
    res.status(500).json({ error: 'Fehler beim Verifizieren des MFA-Setups' });
  } finally {
    client.release();
  }
});

app.post('/api/auth/mfa/verify', async (req, res) => {
  try {
    const { user_id, token, backup_code } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id ist erforderlich' });

    const r = await pool.query(
      'SELECT mitarbeiter_id, name, vorname, email, rolle, mfa_secret, mfa_enabled, mfa_backup_codes FROM mitarbeiter WHERE mitarbeiter_id=$1',
      [user_id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Nutzer nicht gefunden' });
    const u = r.rows[0];
    if (!u.mfa_enabled) return res.status(400).json({ error: 'MFA ist nicht aktiviert' });

    let verified = false;

    if (token) {
      verified = speakeasy.totp.verify({
        secret: u.mfa_secret,
        encoding: 'base32',
        token: String(token),
        window: 1
      });
    } else if (backup_code) {
      // FIX: mfa_backup_codes korrekt als JSON parsen
      let backupCodes = [];
      try {
        backupCodes = Array.isArray(u.mfa_backup_codes) 
          ? u.mfa_backup_codes 
          : JSON.parse(u.mfa_backup_codes || '[]');
      } catch (parseError) {
        console.error('Error parsing backup codes:', parseError);
        backupCodes = [];
      }

      const idx = backupCodes.findIndex(c => c === backup_code);
      if (idx >= 0) {
        const newCodes = [...backupCodes];
        newCodes.splice(idx, 1);
        await pool.query(
          'UPDATE mitarbeiter SET mfa_backup_codes=$1 WHERE mitarbeiter_id=$2',
          [JSON.stringify(newCodes), user_id]  // ← FIX: JSON.stringify hinzugefügt
        );
        verified = true;
      }
    }

    if (!verified) return res.status(401).json({ error: 'MFA-Überprüfung fehlgeschlagen' });

    res.json({
      message: 'Login erfolgreich',
      user: {
        id: u.mitarbeiter_id,
        name: u.name,
        vorname: u.vorname,
        email: u.email,
        rolle: u.rolle,
        mfa_enabled: true
      }
    });
  } catch (e) {
    console.error('MFA verify error:', e);
    res.status(500).json({ error: 'Fehler bei MFA-Überprüfung' });
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


// Passwort vergessen - Reset-Link senden
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'E-Mail ist erforderlich' });
    }
    
    const user = await pool.query(
      'SELECT mitarbeiter_id, email, vorname, name FROM mitarbeiter WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    // Aus Sicherheitsgründen immer "erfolgreich" zurückmelden
    if (!user.rows.length) {
      return res.json({ 
        message: 'Falls die E-Mail-Adresse in unserem System existiert, wurde ein Reset-Link gesendet.' 
      });
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 Stunde gültig
    
    await pool.query(
      'UPDATE mitarbeiter SET reset_token = $1, reset_expires = $2 WHERE mitarbeiter_id = $3',
      [resetToken, resetExpires, user.rows[0].mitarbeiter_id]
    );
    
    // Reset-URL generieren
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    // E-Mail senden
    const mailOptions = {
      from: process.env.SMTP_FROM || emailConfig.auth.user,
      to: email,
      subject: 'Pauly Dashboard - Passwort zurücksetzen',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Passwort zurücksetzen</h2>
          
          <p>Hallo ${user.rows[0].vorname},</p>
          
          <p>Sie haben eine Passwort-Zurücksetzung für Ihr Pauly Dashboard Konto angefordert.</p>
          
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Passwort zurücksetzen
            </a>
          </div>
          
          <p><strong>Wichtige Informationen:</strong></p>
          <ul>
            <li>Dieser Link ist nur 1 Stunde gültig</li>
            <li>Der Link kann nur einmal verwendet werden</li>
            <li>Falls Sie diese E-Mail nicht angefordert haben, ignorieren Sie sie</li>
          </ul>
          
          <p>Alternativ können Sie auch diesen Link kopieren:<br>
          <small style="color: #666; word-break: break-all;">${resetUrl}</small></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Diese E-Mail wurde automatisch generiert. Antworten Sie nicht auf diese E-Mail.
          </p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    console.log(`Password reset requested for: ${email}`);
    
    res.json({ 
      message: 'Falls die E-Mail-Adresse in unserem System existiert, wurde ein Reset-Link gesendet.' 
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Fehler beim Senden der Reset-E-Mail' });
  }
});
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('=== EMAIL DEBUG START ===');
    console.log('Requested email:', email);
    console.log('SMTP Config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS ? `${process.env.SMTP_PASS.substring(0,4)}****` : 'NICHT GESETZT'
    });

    // User lookup
    const user = await pool.query(
      'SELECT mitarbeiter_id, email, vorname, name FROM mitarbeiter WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    console.log('User found:', user.rows.length > 0);
    
    if (!user.rows.length) {
      console.log('=== EMAIL DEBUG END (no user) ===');
      return res.json({ 
        message: 'Falls die E-Mail-Adresse in unserem System existiert, wurde ein Reset-Link gesendet.' 
      });
    }

    // Token generation
    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log('Generated token:', resetToken.substring(0, 10) + '...');
    
    // Database update
    const resetExpires = new Date(Date.now() + 3600000);
    await pool.query(
      'UPDATE mitarbeiter SET reset_token = $1, reset_expires = $2 WHERE mitarbeiter_id = $3',
      [resetToken, resetExpires, user.rows[0].mitarbeiter_id]
    );
    console.log('Database updated');

    // Email sending
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    console.log('Reset URL:', resetUrl);

    // Test transporter first
    console.log('Testing transporter...');
    await transporter.verify();
    console.log('Transporter verified successfully');

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Pauly Dashboard - Passwort zurücksetzen',
      text: `Reset-Link: ${resetUrl}`, // Einfache Text-Version für Debug
      html: `<!-- Dein HTML hier -->`
    };

    console.log('Sending email...');
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('=== EMAIL DEBUG END (success) ===');

    res.json({ 
      message: 'Falls die E-Mail-Adresse in unserem System existiert, wurde ein Reset-Link gesendet.' 
    });
    
  } catch (error) {
    console.error('=== EMAIL ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    console.error('=== EMAIL ERROR END ===');
    
    res.status(500).json({ error: 'Fehler beim Senden der Reset-E-Mail' });
  }
});

// Token validieren (für Frontend-Prüfung)
app.post('/api/auth/validate-reset-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token ist erforderlich' });
    }
    
    const user = await pool.query(
      'SELECT mitarbeiter_id, email, vorname FROM mitarbeiter WHERE reset_token = $1 AND reset_expires > NOW()',
      [token]
    );
    
    if (!user.rows.length) {
      return res.status(400).json({ error: 'Ungültiger oder abgelaufener Reset-Token' });
    }
    
    res.json({ 
      valid: true, 
      email: user.rows[0].email,
      name: user.rows[0].vorname 
    });
    
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({ error: 'Fehler bei der Token-Validierung' });
  }
});

// Neues Passwort setzen
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token und neues Passwort sind erforderlich' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
    }
    
    const user = await pool.query(
      'SELECT mitarbeiter_id, email, vorname FROM mitarbeiter WHERE reset_token = $1 AND reset_expires > NOW()',
      [token]
    );
    
    if (!user.rows.length) {
      return res.status(400).json({ error: 'Ungültiger oder abgelaufener Reset-Token' });
    }
    
    // Passwort hashen
    const hashedPassword = await hashPassword(newPassword);
    
    // Passwort updaten und Reset-Token löschen
    await pool.query(`
      UPDATE mitarbeiter 
      SET passwort_hash = $1, 
          passwort = NULL, 
          reset_token = NULL, 
          reset_expires = NULL,
          updated_at = NOW()
      WHERE mitarbeiter_id = $2
    `, [hashedPassword, user.rows[0].mitarbeiter_id]);
    
    console.log(`Password reset completed for: ${user.rows[0].email}`);
    
    res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Fehler beim Zurücksetzen des Passworts' });
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
    
    if (process.env.AUTO_SEND_EMAIL === 'true') {
      try {
        const defaultEmails = (process.env.DEFAULT_RECIPIENTS || '').split(',').filter(Boolean);
        if (defaultEmails.length) {
          const customerData = await pool.query(
            'SELECT firmenname FROM customers WHERE kunden_id = $1',
            [kunde_id]
          );
          
          if (customerData.rows.length) {
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