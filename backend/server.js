// backend/server.js
'use strict';

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
require('dotenv').config();

// ========= Konstante =========
const SALT_ROUNDS = 12;
const MFA_ISSUER = process.env.MFA_ISSUER || 'Pauly Dashboard';
const isProd = process.env.NODE_ENV === 'production';

// ========= Passwort-Validierungsfunktion =========
const validatePassword = (password) => {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Passwort muss mindestens 8 Zeichen lang sein');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Passwort muss mindestens einen Großbuchstaben enthalten');
  }
  
  if (!/[!@#$%^&*()_+=\[\]{}|;:,.<>?/~`-]/.test(password)) {
    errors.push('Passwort muss mindestens ein Sonderzeichen enthalten');
  }
  
  return errors;
};

// ========= App / Middleware =========
const app = express();

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = isProd
  ? { origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : false, credentials: true }
  : { origin: true, credentials: true };

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

// ========= DB =========
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'db',
  database: process.env.PGDATABASE || 'postgres',
  password: process.env.PGPASSWORD || 'pauly2026!',
  port: Number(process.env.PGPORT || 5432),
});

// ========= Helper =========
const toNumberOrNull = (v) => (v === '' || v === undefined || v === null ? null : Number(v));

const normalizeJSONB = (val) => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return { text: val }; }
  }
  return { value: val };
};

const hashPassword = (pwd) => bcrypt.hash(pwd, SALT_ROUNDS);
const verifyPassword = (pwd, hash) => bcrypt.compare(pwd, hash);

function generateBackupCodes(n = 8) {
  const out = [];
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < n; i++) {
    let c = '';
    for (let j = 0; j < 10; j++) c += alphabet[Math.floor(Math.random() * alphabet.length)];
    out.push(c.slice(0, 5) + '-' + c.slice(5));
  }
  return out;
}

// Dev-freundlicher Token-Check (in Prod verpflichtend)
const verifyToken = (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) {
    if (!isProd) return next(); // im Dev-Modus durchlassen
    return res.status(401).json({ error: 'Ungültiger Access-Token. Bitte loggen Sie sich erneut ein.' });
  }
  // Hier später echte JWT-Prüfung ergänzen
  next();
};

// ========= Mail =========
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'deine-email@gmail.com',
    pass: process.env.SMTP_PASS || 'dein-app-passwort',
  },
};
const transporter = nodemailer.createTransport(emailConfig);

// ========= Health =========
app.get('/api/health', async (_req, res) => {
  try {
    const r = await pool.query('SELECT NOW() as now');
    res.json({ ok: true, db: 'connected', now: r.rows[0].now, env: process.env.NODE_ENV || 'development' });
  } catch {
    res.json({ ok: true, db: 'disconnected', env: process.env.NODE_ENV || 'development' });
  }
});

app.get('/api/test', (_req, res) => {
  res.json({ message: 'Backend läuft!', timestamp: new Date().toISOString() });
});

// ========= Auth: Login / Register =========
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, passwort } = req.body;
    if (!email || !passwort) return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });

    const q = await pool.query(
      `SELECT mitarbeiter_id, name, vorname, email, rolle,
              passwort_hash, mfa_enabled, failed_attempts, locked_until
         FROM mitarbeiter
        WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    if (!q.rows.length) return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    const u = q.rows[0];

    if (u.locked_until && new Date(u.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account gesperrt. Bitte später erneut versuchen.' });
    }

    const ok = await verifyPassword(passwort, u.passwort_hash);
    if (!ok) {
      const attempts = Number(u.failed_attempts || 0) + 1;
      let lockedUntil = null;
      if (attempts >= 5) lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 Min
      await pool.query(
        `UPDATE mitarbeiter SET failed_attempts=$1, locked_until=$2, updated_at=NOW() WHERE mitarbeiter_id=$3`,
        [attempts, lockedUntil, u.mitarbeiter_id]
      );
      return res.status(401).json({ error: 'Falsches Passwort' });
    }

    // success: counters reset + last_login
    await pool.query(
      `UPDATE mitarbeiter
          SET failed_attempts=0, locked_until=NULL, last_login=NOW(), updated_at=NOW()
        WHERE mitarbeiter_id=$1`,
      [u.mitarbeiter_id]
    );

    if (u.mfa_enabled) {
      return res.json({ status: 'MFA_REQUIRED', user_id: u.mitarbeiter_id, email: u.email });
    }

    // (Optional) Tokens ausstellen – hier Dummy fürs Frontend
    res.json({
      message: 'Login erfolgreich',
      accessToken: 'dev-access-token',
      refreshToken: 'dev-refresh-token',
      user: {
        id: u.mitarbeiter_id,
        name: u.name,
        vorname: u.vorname,
        email: u.email,
        rolle: u.rolle,
        mfa_enabled: !!u.mfa_enabled,
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
    
    // Input-Validierung
    if (!vorname || !nachname || !email || !passwort) {
      return res.status(400).json({
        error: 'Alle Felder sind erforderlich'
      });
    }
    
    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Ungültiges E-Mail-Format'
      });
    }
    
    // Passwort-Validierung
    const passwordErrors = validatePassword(passwort);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        error: 'Passwort-Anforderungen nicht erfüllt',
        details: passwordErrors
      });
    }

    const exists = await pool.query('SELECT 1 FROM mitarbeiter WHERE LOWER(email)=LOWER($1)', [email]);
    if (exists.rows.length) return res.status(400).json({ error: 'Benutzer existiert bereits' });

    const passwort_hash = await hashPassword(passwort);

    const r = await pool.query(
      `INSERT INTO mitarbeiter (name, vorname, email, passwort_hash, telefonnummer, rolle)
       VALUES ($1,$2,LOWER($3),$4,'','aussendienst')
       RETURNING mitarbeiter_id, name, vorname, email, rolle`,
      [nachname, vorname, email, passwort_hash]
    );

    res.status(201).json({
      message: 'Registrierung erfolgreich',
      user: r.rows[0],
      accessToken: 'dev-access-token',
      refreshToken: 'dev-refresh-token',
    });
  } catch (e) {
    console.error('Register Error:', e);
    res.status(500).json({ error: 'Fehler bei der Registrierung' });
  }
});

// ========= Change Password (nach den bestehenden Auth-Routen einfügen) =========
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword, user_id } = req.body;
    
    // Input-Validierung
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Aktuelles und neues Passwort sind erforderlich'
      });
    }
    
    // TEMPORÄRE LÖSUNG: user_id wird im Request mitgeschickt
    // TODO: Später durch echte Session/JWT-Authentifizierung ersetzen
    if (!user_id) {
      return res.status(400).json({
        error: 'Benutzer-ID ist erforderlich'
      });
    }
    
    // Passwort-Validierung (verwende die bestehende Funktion)
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        error: 'Neues Passwort erfüllt nicht die Anforderungen',
        details: passwordErrors
      });
    }
    
    // User aus Datenbank holen (richtige Tabelle: mitarbeiter)
    const userResult = await pool.query(
      'SELECT mitarbeiter_id, email, passwort_hash FROM mitarbeiter WHERE mitarbeiter_id = $1',
      [user_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Benutzer nicht gefunden'
      });
    }
    
    const user = userResult.rows[0];
    
    // Aktuelles Passwort prüfen (verwende bestehende verifyPassword Funktion)
    const isValid = await verifyPassword(currentPassword, user.passwort_hash);
    
    if (!isValid) {
      return res.status(401).json({
        error: 'Aktuelles Passwort ist falsch'
      });
    }
    
    // Prüfen ob neues Passwort identisch mit altem ist
    const isSamePassword = await verifyPassword(newPassword, user.passwort_hash);
    if (isSamePassword) {
      return res.status(400).json({
        error: 'Das neue Passwort muss sich vom aktuellen unterscheiden'
      });
    }
    
    // Neues Passwort hashen (verwende bestehende hashPassword Funktion)
    const newHashedPassword = await hashPassword(newPassword);
    
    // Passwort in Datenbank aktualisieren (richtige Tabelle und Spalte)
    await pool.query(
      'UPDATE mitarbeiter SET passwort_hash = $1, updated_at = NOW() WHERE mitarbeiter_id = $2',
      [newHashedPassword, user_id]
    );
    
    // Erfolgreiche Antwort
    res.json({
      message: 'Passwort erfolgreich geändert',
      timestamp: new Date().toISOString()
    });
    
    // Audit-Log für Sicherheit
    console.log(`Password changed for user: ${user.email} at ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Serverfehler beim Ändern des Passworts'
    });
  }
});

// ========= MFA =========
app.post('/api/auth/mfa/setup/start', verifyToken, async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id ist erforderlich' });

    const u = await pool.query('SELECT email FROM mitarbeiter WHERE mitarbeiter_id=$1', [user_id]);
    if (!u.rows.length) return res.status(404).json({ error: 'Nutzer nicht gefunden' });
    const email = u.rows[0].email;

    const secret = speakeasy.generateSecret({
      length: 20,
      name: `${MFA_ISSUER}:${email}`,
      issuer: MFA_ISSUER,
    });

    const otpauth = secret.otpauth_url || speakeasy.otpauthURL({
      secret: secret.base32,
      label: `${MFA_ISSUER}:${email}`,
      issuer: MFA_ISSUER,
      encoding: 'base32',
    });

    const qrDataUrl = await QRCode.toDataURL(otpauth);

    await pool.query('UPDATE mitarbeiter SET mfa_temp_secret=$1 WHERE mitarbeiter_id=$2', [
      secret.base32,
      user_id,
    ]);

    res.json({ otpauth, qrDataUrl, secret: secret.base32 });
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

    const r = await client.query('SELECT mfa_temp_secret FROM mitarbeiter WHERE mitarbeiter_id=$1', [user_id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Nutzer nicht gefunden' });

    const tempSecret = r.rows[0].mfa_temp_secret;
    if (!tempSecret) return res.status(400).json({ error: 'Kein temporäres Secret vorhanden' });

    const ok = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: String(token),
      window: 1,
    });
    if (!ok) return res.status(400).json({ error: 'Ungültiger Code' });

    const backupCodes = generateBackupCodes();

    await client.query('BEGIN');
    await client.query(
      `UPDATE mitarbeiter
          SET mfa_secret=$1,
              mfa_temp_secret=NULL,
              mfa_enabled=true,
              mfa_enrolled_at=NOW(),
              mfa_backup_codes=$2
        WHERE mitarbeiter_id=$3`,
      [tempSecret, JSON.stringify(backupCodes), user_id]
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
      `SELECT mitarbeiter_id, name, vorname, email, rolle,
              mfa_secret, mfa_enabled, mfa_backup_codes
         FROM mitarbeiter
        WHERE mitarbeiter_id=$1`,
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
        window: 1,
      });
    } else if (backup_code) {
      let codes = [];
      try {
        codes = Array.isArray(u.mfa_backup_codes) ? u.mfa_backup_codes : JSON.parse(u.mfa_backup_codes || '[]');
      } catch {
        codes = [];
      }
      const idx = codes.findIndex((c) => c === backup_code);
      if (idx >= 0) {
        const newCodes = [...codes];
        newCodes.splice(idx, 1);
        await pool.query('UPDATE mitarbeiter SET mfa_backup_codes=$1 WHERE mitarbeiter_id=$2', [
          JSON.stringify(newCodes),
          user_id,
        ]);
        verified = true;
      }
    }

    if (!verified) return res.status(401).json({ error: 'MFA-Überprüfung fehlgeschlagen' });

    res.json({
      message: 'Login erfolgreich',
      accessToken: 'dev-access-token',
      refreshToken: 'dev-refresh-token',
      user: {
        id: u.mitarbeiter_id,
        name: u.name,
        vorname: u.vorname,
        email: u.email,
        rolle: u.rolle,
        mfa_enabled: true,
      },
    });
  } catch (e) {
    console.error('MFA verify error:', e);
    res.status(500).json({ error: 'Fehler bei MFA-Überprüfung' });
  }
});

// ========= Passwort zurücksetzen =========
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-Mail ist erforderlich' });

    const user = await pool.query(
      'SELECT mitarbeiter_id, email, vorname FROM mitarbeiter WHERE LOWER(email)=LOWER($1)',
      [email]
    );

    // Immer neutral antworten
    if (!user.rows.length) {
      return res.json({ message: 'Falls die E-Mail existiert, haben wir einen Reset-Link gesendet.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query('UPDATE mitarbeiter SET reset_token=$1, reset_expires=$2 WHERE mitarbeiter_id=$3', [
      resetToken,
      resetExpires,
      user.rows[0].mitarbeiter_id,
    ]);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || emailConfig.auth.user,
      to: email,
      subject: 'Pauly Dashboard - Passwort zurücksetzen',
      html: `
        <h2>Passwort zurücksetzen</h2>
        <p>Hallo ${user.rows[0].vorname || ''},</p>
        <p>Hier ist dein Link zum Zurücksetzen:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Gültig für 1 Stunde.</p>
      `,
    });

    res.json({ message: 'Falls die E-Mail existiert, haben wir einen Reset-Link gesendet.' });
  } catch (e) {
    console.error('Forgot password error:', e);
    res.status(500).json({ error: 'Fehler beim Senden der Reset-E-Mail' });
  }
});

app.post('/api/auth/validate-reset-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token ist erforderlich' });

    const u = await pool.query(
      'SELECT email, vorname FROM mitarbeiter WHERE reset_token=$1 AND reset_expires > NOW()',
      [token]
    );
    if (!u.rows.length) return res.status(400).json({ error: 'Ungültiger oder abgelaufener Reset-Token' });

    res.json({ valid: true, email: u.rows[0].email, name: u.rows[0].vorname });
  } catch (e) {
    console.error('Validate reset token error:', e);
    res.status(500).json({ error: 'Fehler bei der Token-Validierung' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token und neues Passwort sind erforderlich' });

    // Passwort-Validierung
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        error: 'Neues Passwort erfüllt nicht die Anforderungen',
        details: passwordErrors
      });
    }

    const u = await pool.query(
      'SELECT mitarbeiter_id, email FROM mitarbeiter WHERE reset_token=$1 AND reset_expires > NOW()',
      [token]
    );
    if (!u.rows.length) return res.status(400).json({ error: 'Ungültiger oder abgelaufener Reset-Token' });

    const hash = await hashPassword(newPassword);
    await pool.query(
      `UPDATE mitarbeiter
          SET passwort_hash=$1, reset_token=NULL, reset_expires=NULL, updated_at=NOW()
        WHERE mitarbeiter_id=$2`,
      [hash, u.rows[0].mitarbeiter_id]
    );

    res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
  } catch (e) {
    console.error('Reset password error:', e);
    res.status(500).json({ error: 'Fehler beim Zurücksetzen des Passworts' });
  }
});

// ========= Kunden =========
app.get('/api/customers', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT cc.kontakt_id)   AS ansprechpartner_count,
        COUNT(DISTINCT o.onboarding_id) AS onboarding_count
      FROM customers c
      LEFT JOIN customer_contacts cc ON cc.kunden_id = c.kunden_id
      LEFT JOIN onboarding o         ON o.kunde_id   = c.kunden_id
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
    if (!firmenname || !email) return res.status(400).json({ error: 'Firmenname und E-Mail sind Pflichtfelder' });

    await client.query('BEGIN');

    const dupe = await client.query(
      'SELECT kunden_id FROM customers WHERE LOWER(email)=LOWER($1) OR LOWER(firmenname)=LOWER($2)',
      [email, firmenname]
    );
    if (dupe.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Kunde existiert bereits' });
    }

    const c = await client.query(
      `INSERT INTO customers (firmenname, strasse, hausnummer, ort, plz, telefonnummer, email)
       VALUES ($1,$2,$3,$4,$5,$6,LOWER($7))
       RETURNING *`,
      [firmenname, strasse, hausnummer, ort, plz, telefonnummer, email]
    );

    if (ansprechpartner?.name || ansprechpartner?.vorname || ansprechpartner?.email) {
      await client.query(
        `INSERT INTO customer_contacts (kunden_id, vorname, name, position, email, telefonnummer)
         VALUES ($1,$2,$3,$4,LOWER($5),$6)`,
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

// ========= Einzelner Kunde =========
app.get('/api/customers/:id', async (req, res) => {
  try {
    const kundenId = Number(req.params.id);
    if (isNaN(kundenId)) {
      return res.status(400).json({ error: 'Ungültige Kunden-ID' });
    }

    const result = await pool.query(
      `
      SELECT 
        c.*,
        COUNT(DISTINCT cc.kontakt_id)   AS ansprechpartner_count,
        COUNT(DISTINCT o.onboarding_id) AS onboarding_count
      FROM customers c
      LEFT JOIN customer_contacts cc ON cc.kunden_id = c.kunden_id
      LEFT JOIN onboarding o         ON o.kunde_id   = c.kunden_id
      WHERE c.kunden_id = $1
      GROUP BY c.kunden_id
      `,
      [kundenId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (e) {
    console.error('GET /api/customers/:id error:', e);
    res.status(500).json({ error: 'Fehler beim Abrufen des Kunden' });
  }
});

// ========= Onboarding-Daten eines Kunden =========
app.get('/api/onboarding/customer/:kunde_id', async (req, res) => {
  try {
    const kundeId = Number(req.params.kunde_id);
    if (isNaN(kundeId)) {
      return res.status(400).json({ error: 'Ungültige Kunden-ID' });
    }

    const result = await pool.query(
      `SELECT * FROM onboarding WHERE kunde_id = $1 ORDER BY created_at DESC`,
      [kundeId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Keine Onboarding-Daten für diesen Kunden gefunden' });
    }

    res.json(result.rows);
  } catch (e) {
    console.error('GET /api/onboarding/customer/:kunde_id error:', e);
    res.status(500).json({ error: 'Fehler beim Abrufen der Onboarding-Daten' });
  }
});


// ========= Kalkulationen =========
app.get('/api/kalkulationen', async (_req, res) => {
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
    const { kunde_id, stundensatz, dienstleistungen, mwst_prozent } = req.body;
    if (!kunde_id || stundensatz === undefined || !Array.isArray(dienstleistungen)) {
      return res.status(400).json({ error: 'kunde_id, stundensatz und dienstleistungen sind erforderlich' });
    }

    let gesamtzeit = 0;
    let gesamtpreis = 0;
    for (const d of dienstleistungen) {
      const dauer = Number(d?.dauer_pro_einheit) || 0;
      const anzahl = Number(d?.anzahl) || 1;
      const stunden = dauer * anzahl;
      const satz =
        d?.stundensatz === '' || d?.stundensatz === undefined || d?.stundensatz === null
          ? Number(stundensatz) || 0
          : Number(d.stundensatz) || 0;
      gesamtzeit += stunden;
      gesamtpreis += stunden * satz;
    }

    await client.query('BEGIN');

    const k = await client.query(
      `INSERT INTO kalkulationen (kunden_id, datum, stundensatz, mwst_prozent, gesamtzeit, gesamtpreis, status)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, 'neu')
       RETURNING kalkulations_id, datum, stundensatz::float8 AS stundensatz, mwst_prozent::float8 AS mwst_prozent,
                 gesamtzeit::float8 AS gesamtzeit, gesamtpreis::float8 AS gesamtpreis, status`,
      [kunde_id, Number(stundensatz) || 0, mwst_prozent === undefined ? 19 : Number(mwst_prozent), gesamtzeit, gesamtpreis]
    );

    const kalkulationsId = k.rows[0].kalkulations_id;

    for (const d of dienstleistungen) {
      await client.query(
        `INSERT INTO kalkulation_positionen
           (kalkulations_id, section, beschreibung, anzahl, dauer_pro_einheit, stundensatz, info)
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

app.get('/api/kalkulationen/stats', async (_req, res) => {
  try {
    const [kundenCount, aktiveOnb, totalStunden, runningProjects] = await Promise.all([
      // Anzahl Kunden
      pool.query('SELECT COUNT(*) FROM customers'),
      
      // Anzahl laufende Onboardings (als Projekte zählen)
      pool.query('SELECT COUNT(*) FROM onboarding'),
      
      // Gesamtstunden aus allen Kalkulationen
      pool.query(`
        SELECT COALESCE(SUM(gesamtzeit),0)::float8 AS total_hours
          FROM kalkulationen
      `),
      
      // Laufende Projekte (Kalkulationen mit Status 'neu' oder 'in_bearbeitung')
      pool.query(`
        SELECT COUNT(*)::int AS running_projects
          FROM kalkulationen
         WHERE status IN ('neu', 'in_bearbeitung', 'laufend')
      `),
    ]);

    res.json({
      activeCustomers: Number(kundenCount.rows[0].count || 0),
      runningProjects: Number(runningProjects.rows[0].running_projects || aktiveOnb.rows[0].count || 0), // Fallback auf Onboardings
      totalHours: Number(totalStunden.rows[0].total_hours || 0),
    });
  } catch (e) {
    console.error('GET /api/kalkulationen/stats error:', e);
    res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
  }
});

// ========= Onboarding =========

// Hilfsfunktion: vollständige Onboarding-Daten für E-Mail/Export
async function getFullOnboardingData(onboardingId) {
  // Hauptdaten (Achtung: onboarding.kunde_id!)
  const mainQuery = await pool.query(
    `
    SELECT 
      o.*,
      c.firmenname, c.email as kunde_email, c.strasse, c.hausnummer, 
      c.plz, c.ort, c.telefonnummer as kunde_telefon,
      cc.vorname as ansprechpartner_vorname, cc.name as ansprechpartner_name,
      cc.position, cc.email as ansprechpartner_email, cc.telefonnummer as ansprechpartner_telefon
    FROM onboarding o
    LEFT JOIN customers c     ON o.kunde_id = c.kunden_id
    LEFT JOIN customer_contacts cc ON c.kunden_id = cc.kunden_id
    WHERE o.onboarding_id = $1
    `,
    [onboardingId]
  );
  if (!mainQuery.rows.length) throw new Error('Onboarding nicht gefunden');
  const main = mainQuery.rows[0];

  const netzwerk = await pool.query('SELECT * FROM onboarding_network WHERE onboarding_id=$1', [onboardingId]);
  const hardware = await pool.query('SELECT * FROM onboarding_hardware WHERE onboarding_id=$1', [onboardingId]);
  const mail = await pool.query('SELECT * FROM onboarding_mail WHERE onboarding_id=$1', [onboardingId]);

  const sw = await pool.query('SELECT * FROM onboarding_software WHERE onboarding_id=$1', [onboardingId]);
  let softwareData = null;
  if (sw.rows.length) {
    const swId = sw.rows[0].software_id;
    const reqs = await pool.query(
      'SELECT type, detail FROM onboarding_software_requirements WHERE software_id=$1',
      [swId]
    );
    const apps = await pool.query('SELECT name FROM onboarding_software_apps WHERE software_id=$1', [swId]);
    softwareData = { ...sw.rows[0], requirements: reqs.rows, apps: apps.rows.map(a => a.name) };
  }

  const backup = await pool.query('SELECT * FROM onboarding_backup WHERE onboarding_id=$1', [onboardingId]);
  const sonstiges = await pool.query('SELECT * FROM onboarding_sonstiges WHERE onboarding_id=$1', [onboardingId]);

  return {
    onboarding_info: { id: main.onboarding_id, datum: main.created_at, bearbeiter: 'System' },
    kunde: {
      firmenname: main.firmenname,
      adresse: { strasse: main.strasse, hausnummer: main.hausnummer, plz: main.plz, ort: main.ort },
      kontakt: { email: main.kunde_email, telefon: main.kunde_telefon },
      ansprechpartner: {
        name: `${main.ansprechpartner_vorname || ''} ${main.ansprechpartner_name || ''}`.trim(),
        position: main.position,
        email: main.ansprechpartner_email,
        telefon: main.ansprechpartner_telefon,
      },
    },
    it_infrastruktur: {
      netzwerk: netzwerk.rows[0] || null,
      hardware: hardware.rows || [],
      mail: mail.rows[0] || null,
      software: softwareData,
      backup: backup.rows[0] || null,
      sonstiges: sonstiges.rows.map(s => s.text) || [],
    },
    export_datum: new Date().toISOString(),
  };
}

app.post('/api/onboarding', async (req, res) => {
  const client = await pool.connect();
  try {
    const { kunde_id, infrastructure_data } = req.body;
    if (!kunde_id || !infrastructure_data) {
      return res.status(400).json({ error: 'kunde_id und infrastructure_data sind erforderlich' });
    }

    await client.query('BEGIN');

    // ACHTUNG: Spalte heißt kunde_id (nicht kunden_id)
    const ob = await client.query(
      `INSERT INTO onboarding (kunde_id) VALUES ($1) RETURNING onboarding_id`,
      [kunde_id]
    );
    const onboardingId = ob.rows[0].onboarding_id;

    if (infrastructure_data.netzwerk) {
      const n = infrastructure_data.netzwerk;
      await client.query(
        `INSERT INTO onboarding_network
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

      const apps =
        Array.isArray(s.verwendete_applikationen) && s.verwendete_applikationen.length
          ? s.verwendete_applikationen
          : (s.verwendete_applikationen_text || '')
              .split('\n')
              .map((x) => x.trim())
              .filter(Boolean);

      for (const appName of apps) {
        await client.query(`INSERT INTO onboarding_software_apps (software_id, name) VALUES ($1,$2)`, [
          softwareId,
          appName,
        ]);
      }
    }

    if (infrastructure_data.backup) {
      const b = infrastructure_data.backup;
      await client.query(
        `INSERT INTO onboarding_backup
           (onboarding_id, tool, interval, retention, location, size, info)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [onboardingId, b.tool || null, b.interval || null, b.retention || null, b.location || null, toNumberOrNull(b.size), b.info || null]
      );
    }

    if (infrastructure_data.sonstiges?.text) {
      await client.query(`INSERT INTO onboarding_sonstiges (onboarding_id, text) VALUES ($1,$2)`, [
        onboardingId,
        infrastructure_data.sonstiges.text,
      ]);
    }

    await client.query('COMMIT');

    res.status(201).json({ message: 'Onboarding gespeichert', onboarding_id: onboardingId });
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error('❌ Onboarding Error:', e);
    res.status(500).json({ error: 'Fehler beim Speichern des Onboardings: ' + e.message });
  } finally {
    client.release();
  }
});

app.post('/api/onboarding/:id/send-email', async (req, res) => {
  try {
    const onboardingId = Number(req.params.id);
    const { email_addresses, subject, message } = req.body;
    if (!email_addresses || !Array.isArray(email_addresses)) {
      return res.status(400).json({ error: 'E-Mail-Adressen sind erforderlich' });
    }

    const data = await getFullOnboardingData(onboardingId);
    const jsonContent = JSON.stringify(data, null, 2);
    const fileName = `onboarding_${data.kunde.firmenname.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date()
      .toISOString()
      .split('T')[0]}.json`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || emailConfig.auth.user,
      to: email_addresses.join(', '),
      subject: subject || `Onboarding-Daten: ${data.kunde.firmenname}`,
      html: `
        <h2>Onboarding-Daten für ${data.kunde.firmenname}</h2>
        ${message ? `<p>${message}</p>` : ''}
        <p>Im Anhang finden Sie die vollständigen Daten als JSON-Datei.</p>
      `,
      attachments: [{ filename: fileName, content: jsonContent, contentType: 'application/json' }],
    });

    res.json({ message: 'E-Mail erfolgreich versendet', recipients: email_addresses, filename: fileName });
  } catch (e) {
    console.error('E-Mail Versand Fehler:', e);
    res.status(500).json({ error: `Fehler beim E-Mail-Versand: ${e.message}` });
  }
});

app.get('/api/onboarding/:id/export', async (req, res) => {
  try {
    const onboardingId = Number(req.params.id);
    const data = await getFullOnboardingData(onboardingId);
    const fileName = `onboarding_${data.kunde.firmenname.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date()
      .toISOString()
      .split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Export Fehler:', e);
    res.status(500).json({ error: `Fehler beim Export: ${e.message}` });
  }
});

// ========= Projekte (Onboarding mit erweiterten Infos) =========
app.get('/api/onboarding/projects', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.onboarding_id,
        o.kunde_id,
        o.status,
        o.created_at,
        o.updated_at,
        c.firmenname,
        
        -- Netzwerk-Info
        CASE WHEN n.onboarding_id IS NOT NULL THEN true ELSE false END as has_network,
        
        -- Hardware-Count
        COUNT(DISTINCT h.hardware_id) as hardware_count,
        
        -- Software-Count  
        COUNT(DISTINCT s.software_id) as software_count,
        
        -- Mail-Info
        CASE WHEN m.onboarding_id IS NOT NULL THEN true ELSE false END as has_mail,
        
        -- Backup-Info
        CASE WHEN b.onboarding_id IS NOT NULL THEN true ELSE false END as has_backup
        
      FROM onboarding o
      LEFT JOIN customers c ON o.kunde_id = c.kunden_id
      LEFT JOIN onboarding_network n ON o.onboarding_id = n.onboarding_id
      LEFT JOIN onboarding_hardware h ON o.onboarding_id = h.onboarding_id
      LEFT JOIN onboarding_software s ON o.onboarding_id = s.onboarding_id
      LEFT JOIN onboarding_mail m ON o.onboarding_id = m.onboarding_id
      LEFT JOIN onboarding_backup b ON o.onboarding_id = b.onboarding_id
      
      GROUP BY 
        o.onboarding_id, o.kunde_id, o.status, o.created_at, o.updated_at,
        c.firmenname, n.onboarding_id, m.onboarding_id, b.onboarding_id
      ORDER BY o.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('GET /api/onboarding/projects error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Projekte' });
  }
});

// ========= Projekt-Status aktualisieren =========
app.patch('/api/onboarding/:id/status', async (req, res) => {
  try {
    const onboardingId = Number(req.params.id);
    const { status } = req.body;
    
    if (!onboardingId) {
      return res.status(400).json({ error: 'Ungültige Onboarding-ID' });
    }
    
    if (!status || !['offen', 'erledigt'].includes(status)) {
      return res.status(400).json({ error: 'Status muss "offen" oder "erledigt" sein' });
    }
    
    // Prüfen ob Onboarding existiert
    const exists = await pool.query(
      'SELECT onboarding_id FROM onboarding WHERE onboarding_id = $1',
      [onboardingId]
    );
    
    if (!exists.rows.length) {
      return res.status(404).json({ error: 'Onboarding nicht gefunden' });
    }
    
    // Status aktualisieren
    const result = await pool.query(
      'UPDATE onboarding SET status = $1, updated_at = NOW() WHERE onboarding_id = $2 RETURNING *',
      [status, onboardingId]
    );
    
    res.json({
      message: `Status erfolgreich auf "${status}" aktualisiert`,
      onboarding: result.rows[0]
    });
    
  } catch (error) {
    console.error('PATCH /api/onboarding/:id/status error:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Status' });
  }
});

// ========= 404 =========
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route nicht gefunden: ' + req.originalUrl,
    available_routes: [
      '/api/health',
      '/api/test',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/forgot-password',
      '/api/auth/validate-reset-token',
      '/api/auth/reset-password',
      '/api/auth/mfa/setup/start',
      '/api/auth/mfa/setup/verify',
      '/api/auth/mfa/verify',
      '/api/customers',
      '/api/kalkulationen',
      '/api/kalkulationen/stats',
      '/api/onboarding',
      '/api/onboarding/:id/send-email',
      '/api/onboarding/:id/export',
    ],
  });
});

// ========= Start =========
const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${PORT}`);
});