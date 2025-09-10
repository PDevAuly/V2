// backend/server.js
'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;

// ======================= MIDDLEWARE =======================
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const corsOptions = isProd
  ? { origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : false, credentials: true }
  : { origin: true, credentials: true };

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

// ======================= DB =======================
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'db',
  database: process.env.PGDATABASE || 'postgres',
  password: process.env.PGPASSWORD || 'pauly2026!',
  port: Number(process.env.PGPORT || 5432),
});

// ======================= HELPERS =======================
const SALT_ROUNDS = 12;
const MFA_ISSUER = process.env.MFA_ISSUER || 'Pauly Dashboard';

const toNumberOrNull = (v) =>
  v === '' || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v);
const toBool = (v) => v === true || v === 'true' || v === 1 || v === '1';

const normalizeJSONB = (val) => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return { text: val }; }
  }
  return { value: val };
};

const validatePassword = (password) => {
  const errors = [];
  if (!password || password.length < 8) errors.push('Mindestens 8 Zeichen');
  if (!/[A-Z]/.test(password)) errors.push('Mindestens ein Großbuchstabe');
  if (!/[!@#$%^&*()_+=\[\]{}|;:,.<>?/~`-]/.test(password)) errors.push('Mindestens ein Sonderzeichen');
  return errors;
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

const verifyToken = (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) {
    if (!isProd) return next(); // dev: durchlassen
    return res.status(401).json({ error: 'Ungültiger Access-Token' });
  }
  // TODO: echte JWT-Prüfung in Prod
  next();
};

// ======================= MAIL =======================
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

// ======================= HEALTH =======================
app.get('/api/health', async (_req, res) => {
  try {
    const r = await pool.query('SELECT NOW() as now');
    res.json({ ok: true, db: 'connected', now: r.rows[0].now, env: process.env.NODE_ENV || 'development' });
  } catch {
    res.json({ ok: true, db: 'disconnected', env: process.env.NODE_ENV || 'development' });
  }
});
app.get('/api/test', (_req, res) => res.json({ message: 'Backend läuft!', ts: new Date().toISOString() }));

// ======================= AUTH (Kurzfassung) =======================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { vorname, nachname, email, passwort } = req.body;
    if (!vorname || !nachname || !email || !passwort) return res.status(400).json({ error: 'Alle Felder erforderlich' });
    const pwErr = validatePassword(passwort);
    if (pwErr.length) return res.status(400).json({ error: 'Passwort-Anforderungen nicht erfüllt', details: pwErr });

    const exists = await pool.query('SELECT 1 FROM mitarbeiter WHERE LOWER(email)=LOWER($1)', [email]);
    if (exists.rows.length) return res.status(400).json({ error: 'Benutzer existiert bereits' });

    const passwort_hash = await hashPassword(passwort);
    const r = await pool.query(
      `INSERT INTO mitarbeiter (name, vorname, email, passwort_hash, telefonnummer, rolle)
       VALUES ($1,$2,LOWER($3),$4,'','aussendienst')
       RETURNING mitarbeiter_id, name, vorname, email, rolle`,
      [nachname, vorname, email, passwort_hash]
    );
    res.status(201).json({ message: 'Registrierung erfolgreich', user: r.rows[0], accessToken: 'dev', refreshToken: 'dev' });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Fehler bei der Registrierung' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, passwort } = req.body;
    if (!email || !passwort) return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });

    const q = await pool.query(
      `SELECT mitarbeiter_id, name, vorname, email, rolle, passwort_hash, mfa_enabled, failed_attempts, locked_until
       FROM mitarbeiter WHERE LOWER(email)=LOWER($1)`, [email]
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
      if (attempts >= 5) lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      await pool.query(
        `UPDATE mitarbeiter SET failed_attempts=$1, locked_until=$2, updated_at=NOW() WHERE mitarbeiter_id=$3`,
        [attempts, lockedUntil, u.mitarbeiter_id]
      );
      return res.status(401).json({ error: 'Falsches Passwort' });
    }

    await pool.query(
      `UPDATE mitarbeiter SET failed_attempts=0, locked_until=NULL, last_login=NOW(), updated_at=NOW() WHERE mitarbeiter_id=$1`,
      [u.mitarbeiter_id]
    );

    if (u.mfa_enabled) return res.json({ status: 'MFA_REQUIRED', user_id: u.mitarbeiter_id, email: u.email });

    res.json({
      message: 'Login erfolgreich',
      accessToken: 'dev', refreshToken: 'dev',
      user: { id: u.mitarbeiter_id, name: u.name, vorname: u.vorname, email: u.email, rolle: u.rolle, mfa_enabled: !!u.mfa_enabled }
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Fehler beim Login' });
  }
});

// ======================= CUSTOMERS =======================
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
    console.error('GET /api/customers error:', e);
    res.status(500).json({ error: 'Fehler beim Abrufen der Kunden' });
  }
});

app.get('/api/customers/:id(\\d+)', async (req, res) => {
  try {
    const kundenId = Number(req.params.id);
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
    if (!result.rows.length) return res.status(404).json({ error: 'Kunde nicht gefunden' });
    res.json(result.rows[0]);
  } catch (e) {
    console.error('GET /api/customers/:id error:', e);
    res.status(500).json({ error: 'Fehler beim Abrufen des Kunden' });
  }
});

// Kunde anlegen (+ optionale komplette Infrastruktur – Option B)
app.post('/api/customers', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      firmenname, strasse, hausnummer, ort, plz, telefonnummer, email, ansprechpartner,
      infrastructure_data // optional
    } = req.body;

    if (!firmenname || !email) return res.status(400).json({ error: 'Firmenname und E-Mail sind Pflichtfelder' });

    await client.query('BEGIN');

    // Duplikatcheck
    const dupe = await client.query(
      'SELECT kunden_id FROM customers WHERE LOWER(email)=LOWER($1) OR LOWER(firmenname)=LOWER($2)',
      [email, firmenname]
    );
    if (dupe.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Kunde existiert bereits' });
    }

    // Kunde
    const c = await client.query(
      `INSERT INTO customers (firmenname, strasse, hausnummer, ort, plz, telefonnummer, email)
       VALUES ($1,$2,$3,$4,$5,$6,LOWER($7))
       RETURNING *`,
      [firmenname, strasse, hausnummer, ort, plz, telefonnummer, email]
    );
    const kundenId = c.rows[0].kunden_id;

    // Ansprechpartner (optional)
    if (ansprechpartner?.name || ansprechpartner?.vorname || ansprechpartner?.email) {
      await client.query(
        `INSERT INTO customer_contacts (kunden_id, vorname, name, position, email, telefonnummer)
         VALUES ($1,$2,$3,$4,LOWER($5),$6)`,
        [
          kundenId,
          ansprechpartner?.vorname || null,
          ansprechpartner?.name || null,
          ansprechpartner?.position || null,
          ansprechpartner?.email || email,
          ansprechpartner?.telefonnummer || telefonnummer || null,
        ]
      );
    }

    // Infrastruktur (optional)
    if (infrastructure_data) {
      const { netzwerk, hardware, software, mail, backup, sonstiges } = infrastructure_data;

      // Onboarding-Header
      const ob = await client.query(
        `INSERT INTO onboarding (kunde_id) VALUES ($1) RETURNING onboarding_id`,
        [kundenId]
      );
      const onboardingId = ob.rows[0].onboarding_id;

      // Netzwerk (1:1)
      if (netzwerk && Object.keys(netzwerk).length) {
        await client.query(
          `INSERT INTO onboarding_network
             (onboarding_id, internetzugangsart, firewall_modell, feste_ip_vorhanden,
              ip_adresse, vpn_einwahl_erforderlich, aktuelle_vpn_user, geplante_vpn_user, informationen)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            onboardingId,
            netzwerk.internetzugangsart || null,
            netzwerk.firewall_modell || null,
            !!netzwerk.feste_ip_vorhanden,
            netzwerk.ip_adresse || null,
            !!netzwerk.vpn_einwahl_erforderlich,
            toNumberOrNull(netzwerk.aktuelle_vpn_user),
            toNumberOrNull(netzwerk.geplante_vpn_user),
            netzwerk.informationen || null,
          ]
        );
      }

      // Hardware (Liste oder Einzelobjekt)
      const hwList = Array.isArray(hardware?.hardwareList)
        ? hardware.hardwareList
        : (hardware && (
            hardware.typ || hardware.hersteller || hardware.modell || hardware.seriennummer ||
            hardware.standort || hardware.ip || (hardware.details_jsonb && Object.keys(hardware.details_jsonb).length) ||
            hardware.informationen
          )) ? [hardware] : [];

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

      // Mail (1:1)
      if (mail && Object.keys(mail).length) {
        const m = mail;
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

      // Software (+ Requirements + Apps)
      if (software && Object.keys(software).length) {
        const s = software;
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
          await client.query(
            `INSERT INTO onboarding_software_apps (software_id, name) VALUES ($1,$2)`,
            [softwareId, appName]
          );
        }
      }

      // Backup (1:1)
      if (backup && Object.keys(backup).length) {
        const b = backup;
        await client.query(
          `INSERT INTO onboarding_backup
             (onboarding_id, tool, interval, retention, location, size, info)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [onboardingId, b.tool || null, b.interval || null, b.retention || null, b.location || null, toNumberOrNull(b.size), b.info || null]
        );
      }

      // Sonstiges (1:1)
      if (sonstiges?.text) {
        await client.query(
          `INSERT INTO onboarding_sonstiges (onboarding_id, text) VALUES ($1,$2)`,
          [onboardingId, sonstiges.text]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Kunde wurde angelegt.', kunde: c.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Create customer error:', e);
    res.status(500).json({ error: 'Fehler beim Erstellen des Kunden/Onboardings: ' + e.message });
  } finally {
    client.release();
  }
});

// ======================= ONBOARDING =======================
// !!! WICHTIG: Reihenfolge — Liste vor :id-Route !!!

// Projekte-Liste
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
        c.email,
        c.plz,
        c.ort,
        COUNT(DISTINCT oh.hardware_id)::int AS hardware_count,
        COUNT(DISTINCT os.software_id)::int AS software_count,
        (COUNT(onw.network_id) > 0)         AS has_network
      FROM onboarding o
      LEFT JOIN customers            c   ON c.kunden_id      = o.kunde_id
      LEFT JOIN onboarding_hardware  oh  ON oh.onboarding_id = o.onboarding_id
      LEFT JOIN onboarding_software  os  ON os.onboarding_id = o.onboarding_id
      LEFT JOIN onboarding_network   onw ON onw.onboarding_id= o.onboarding_id
      GROUP BY o.onboarding_id, c.firmenname, c.email, c.plz, c.ort
      ORDER BY o.onboarding_id DESC
    `);
    res.json(result.rows);
  } catch (e) {
    console.error('GET /api/onboarding/projects error:', e);
    res.status(500).json({ error: 'Fehler beim Abrufen der Onboarding-Projekte' });
  }
});

// Onboarding(s) eines Kunden
app.get('/api/onboarding/customer/:kunde_id(\\d+)', async (req, res) => {
  try {
    const kundeId = Number(req.params.kunde_id);
    const { rows } = await pool.query(
      `SELECT onboarding_id, kunde_id, status, datum, created_at, updated_at
         FROM onboarding
        WHERE kunde_id = $1
        ORDER BY created_at DESC`,
      [kundeId]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /api/onboarding/customer/:kunde_id error:', e);
    res.status(500).json({ error: 'Fehler beim Abrufen der Onboardings des Kunden' });
  }
});

// Einzelnes Onboarding inkl. Unterdaten
app.get('/api/onboarding/:id(\\d+)', async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const ob = await client.query(
      `SELECT onboarding_id, kunde_id, status, datum, mitarbeiter_id, infrastructure_data,
              created_at, updated_at
         FROM onboarding
        WHERE onboarding_id = $1`,
      [id]
    );
    if (!ob.rows.length) return res.status(404).json({ error: 'Onboarding nicht gefunden' });

    const [netz, hw, sw, mail, backup, sonst] = await Promise.all([
      client.query(`SELECT * FROM onboarding_network  WHERE onboarding_id=$1 LIMIT 1`, [id]),
      client.query(`SELECT * FROM onboarding_hardware WHERE onboarding_id=$1 ORDER BY hardware_id`, [id]),
      client.query(`
        SELECT s.*,
               COALESCE((
                 SELECT json_agg(json_build_object('type', r.type, 'detail', r.detail) ORDER BY r.requirement_id)
                 FROM onboarding_software_requirements r WHERE r.software_id = s.software_id
               ), '[]'::json) AS requirements,
               COALESCE((
                 SELECT json_agg(json_build_object('name', a.name) ORDER BY a.app_id)
                 FROM onboarding_software_apps a WHERE a.software_id = s.software_id
               ), '[]'::json) AS apps
          FROM onboarding_software s
         WHERE s.onboarding_id = $1
         ORDER BY s.software_id
      `, [id]),
      client.query(`SELECT * FROM onboarding_mail      WHERE onboarding_id=$1 LIMIT 1`, [id]),
      client.query(`SELECT * FROM onboarding_backup    WHERE onboarding_id=$1 LIMIT 1`, [id]),
      client.query(`SELECT * FROM onboarding_sonstiges WHERE onboarding_id=$1 LIMIT 1`, [id]),
    ]);

    res.json({
      ...ob.rows[0],
      netzwerk: netz.rows[0] || null,
      hardware: hw.rows || [],
      software: sw.rows || [],
      mail: mail.rows[0] || null,
      backup: backup.rows[0] || null,
      sonstiges: sonst.rows[0] || null,
    });
  } catch (e) {
    console.error('GET /api/onboarding/:id error:', e);
    res.status(500).json({ error: 'Fehler beim Laden des Onboardings' });
  } finally {
    client.release();
  }
});

// Neues Onboarding (für bestehenden Kunden) – Payload flach ODER unter infrastructure_data
app.post('/api/onboarding', async (req, res) => {
  const client = await pool.connect();
  try {
    const { kunde_id } = req.body;
    if (!kunde_id) return res.status(400).json({ error: 'kunde_id ist erforderlich' });

    const payload = req.body.infrastructure_data ?? req.body;
    const { netzwerk, hardware, software, mail, backup, sonstiges } = payload;

    await client.query('BEGIN');

    const { rows: [ob] } = await client.query(
      'INSERT INTO onboarding (kunde_id, status) VALUES ($1,$2) RETURNING onboarding_id, created_at',
      [kunde_id, 'neu']
    );
    const onboardingId = ob.onboarding_id;

    // Netzwerk
    if (netzwerk && Object.keys(netzwerk).length) {
      await client.query(`
        INSERT INTO onboarding_network (
          onboarding_id, internetzugangsart, firewall_modell, feste_ip_vorhanden,
          ip_adresse, vpn_einwahl_erforderlich, aktuelle_vpn_user, geplante_vpn_user, informationen
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        onboardingId,
        netzwerk.internetzugangsart ?? null,
        netzwerk.firewall_modell ?? null,
        toBool(netzwerk.feste_ip_vorhanden),
        netzwerk.ip_adresse ?? null,
        toBool(netzwerk.vpn_einwahl_erforderlich),
        toNumberOrNull(netzwerk.aktuelle_vpn_user),
        toNumberOrNull(netzwerk.geplante_vpn_user),
        netzwerk.informationen ?? null,
      ]);
    }

    // Hardware
    const hwList = Array.isArray(hardware) ? hardware
                : Array.isArray(hardware?.hardwareList) ? hardware.hardwareList
                : (hardware && Object.keys(hardware).length ? [hardware] : []);
    for (const hw of hwList) {
      await client.query(`
        INSERT INTO onboarding_hardware (
          onboarding_id, typ, hersteller, modell, seriennummer, standort, ip, details_jsonb, informationen
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        onboardingId,
        hw.typ ?? null,
        hw.hersteller ?? null,
        hw.modell ?? null,
        hw.seriennummer ?? null,
        hw.standort ?? null,
        hw.ip ?? null,
        JSON.stringify(normalizeJSONB(hw.details_jsonb ?? hw.details)),
        hw.informationen ?? null,
      ]);
    }

    // Software (+ Requirements + Apps)
    const swList = Array.isArray(software) ? software
                : Array.isArray(software?.softwareList) ? software.softwareList
                : (software && Object.keys(software).length ? [software] : []);
    for (const sw of swList) {
      const { rows: [srow] } = await client.query(`
        INSERT INTO onboarding_software (
          onboarding_id, name, licenses, critical, description, virenschutz, schnittstellen,
          wartungsvertrag, migration_support, verwendete_applikationen_text
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING software_id
      `, [
        onboardingId,
        sw.name ?? null,
        toNumberOrNull(sw.licenses),
        sw.critical ?? null,
        sw.description ?? null,
        sw.virenschutz ?? null,
        sw.schnittstellen ?? null,
        toBool(sw.wartungsvertrag),
        toBool(sw.migration_support),
        sw.verwendete_applikationen_text ?? null,
      ]);
      const softwareId = srow.software_id;

      const reqs = Array.isArray(sw.requirements) ? sw.requirements : [];
      for (const r of reqs) {
        await client.query(
          `INSERT INTO onboarding_software_requirements (software_id, type, detail) VALUES ($1,$2,$3)`,
          [softwareId, r.type ?? null, r.detail ?? null]
        );
      }

      const apps = Array.isArray(sw.apps) ? sw.apps : [];
      for (const a of apps) {
        await client.query(
          `INSERT INTO onboarding_software_apps (software_id, name) VALUES ($1,$2)`,
          [softwareId, a.name ?? a]
        );
      }
    }

    // Mail
    if (mail && Object.keys(mail).length) {
      await client.query(`
        INSERT INTO onboarding_mail (
          onboarding_id, anbieter, anzahl_postfach, anzahl_shared, gesamt_speicher,
          pop3_connector, mobiler_zugriff, informationen
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [
        onboardingId,
        mail.anbieter ?? null,
        toNumberOrNull(mail.anzahl_postfach),
        toNumberOrNull(mail.anzahl_shared),
        toNumberOrNull(mail.gesamt_speicher),
        toBool(mail.pop3_connector),
        toBool(mail.mobiler_zugriff),
        mail.informationen ?? null,
      ]);
    }

    // Backup
    if (backup && Object.keys(backup).length) {
      await client.query(`
        INSERT INTO onboarding_backup (
          onboarding_id, tool, interval, retention, location, size, info
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [
        onboardingId,
        backup.tool ?? null,
        backup.interval ?? null,
        backup.retention ?? null,
        backup.location ?? null,
        toNumberOrNull(backup.size),
        backup.info ?? null,
      ]);
    }

    // Sonstiges
    if (sonstiges && (sonstiges.text || sonstiges.informationen)) {
      await client.query(`
        INSERT INTO onboarding_sonstiges (onboarding_id, text) VALUES ($1,$2)
      `, [onboardingId, (sonstiges.text ?? sonstiges.informationen) || null]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Onboarding angelegt', onboarding_id: onboardingId });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Create onboarding error:', e);
    res.status(500).json({ error: 'Fehler beim Anlegen des Onboardings' });
  } finally {
    client.release();
  }
});

// Bearbeiten (Upsert) – Payload flach ODER unter infrastructure_data
app.patch('/api/onboarding/:id(\\d+)', async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const root = req.body.infrastructure_data ?? req.body;
    const { status, netzwerk, hardware, software, mail, backup, sonstiges, datum, mitarbeiter_id } = root;

    await client.query('BEGIN');

    await client.query(
      `UPDATE onboarding
         SET status = COALESCE($1, status),
             datum = COALESCE($2, datum),
             mitarbeiter_id = COALESCE($3, mitarbeiter_id),
             updated_at = NOW()
       WHERE onboarding_id=$4`,
      [status ?? null, datum ?? null, mitarbeiter_id ?? null, id]
    );

    // Netzwerk: UPDATE oder INSERT
    if (netzwerk) {
      const n = netzwerk;
      const upd = await client.query(
        `UPDATE onboarding_network
            SET internetzugangsart=$1, firewall_modell=$2, feste_ip_vorhanden=$3,
                ip_adresse=$4, vpn_einwahl_erforderlich=$5, aktuelle_vpn_user=$6,
                geplante_vpn_user=$7, informationen=$8, updated_at=NOW()
          WHERE onboarding_id=$9`,
        [
          n.internetzugangsart ?? null, n.firewall_modell ?? null, toBool(n.feste_ip_vorhanden),
          n.ip_adresse ?? null, toBool(n.vpn_einwahl_erforderlich),
          toNumberOrNull(n.aktuelle_vpn_user), toNumberOrNull(n.geplante_vpn_user),
          n.informationen ?? null, id
        ]
      );
      if (upd.rowCount === 0) {
        await client.query(
          `INSERT INTO onboarding_network
             (onboarding_id, internetzugangsart, firewall_modell, feste_ip_vorhanden,
              ip_adresse, vpn_einwahl_erforderlich, aktuelle_vpn_user, geplante_vpn_user, informationen)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            id, n.internetzugangsart ?? null, n.firewall_modell ?? null, toBool(n.feste_ip_vorhanden),
            n.ip_adresse ?? null, toBool(n.vpn_einwahl_erforderlich), toNumberOrNull(n.aktuelle_vpn_user),
            toNumberOrNull(n.geplante_vpn_user), n.informationen ?? null
          ]
        );
      }
    }

    // Hardware: volle Ersetzung
    if (hardware) {
      await client.query('DELETE FROM onboarding_hardware WHERE onboarding_id=$1', [id]);
      const hwList = Array.isArray(hardware) ? hardware
                  : Array.isArray(hardware?.hardwareList) ? hardware.hardwareList
                  : (hardware && Object.keys(hardware).length ? [hardware] : []);
      for (const hw of hwList) {
        await client.query(
          `INSERT INTO onboarding_hardware
             (onboarding_id, typ, hersteller, modell, seriennummer, standort, ip, details_jsonb, informationen)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            id,
            hw.typ || null, hw.hersteller || null, hw.modell || null, hw.seriennummer || null,
            hw.standort || null, hw.ip || null,
            JSON.stringify(normalizeJSONB(hw.details_jsonb ?? hw.details)),
            hw.informationen || null,
          ]
        );
      }
    }

  if (software) {
  // Nur Parent löschen – Kinder (requirements, apps) fallen per ON DELETE CASCADE mit
  await client.query(
    `DELETE FROM onboarding_software WHERE onboarding_id=$1`,
    [id]
  );

  const swList = Array.isArray(software) ? software
              : Array.isArray(software?.softwareList) ? software.softwareList
              : (software && Object.keys(software).length ? [software] : []);

  for (const s of swList) {
    const { rows: [ins] } = await client.query(
      `INSERT INTO onboarding_software (
         onboarding_id, name, licenses, critical, description, virenschutz, schnittstellen,
         wartungsvertrag, migration_support, verwendete_applikationen_text
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING software_id`,
      [
        id,
        s.name ?? null,
        toNumberOrNull(s.licenses),
        s.critical ?? null,
        s.description ?? null,
        s.virenschutz ?? null,
        s.schnittstellen ?? null,
        toBool(s.wartungsvertrag),
        toBool(s.migration_support),
        s.verwendete_applikationen_text ?? null,
      ]
    );
    const softwareId = ins.software_id;

    // Requirements (optional)
    const reqs = Array.isArray(s.requirements) ? s.requirements : [];
    for (const r of reqs) {
      await client.query(
        `INSERT INTO onboarding_software_requirements (software_id, type, detail)
         VALUES ($1,$2,$3)`,
        [softwareId, r?.type ?? null, r?.detail ?? null]
      );
    }

    // Apps: akzeptiert s.apps (Array aus Strings/Objekten), s.verwendete_applikationen (Array)
    // oder s.verwendete_applikationen_text (Zeilenweise)
    let apps = [];
    if (Array.isArray(s.apps)) {
      apps = s.apps;
    } else if (Array.isArray(s.verwendete_applikationen)) {
      apps = s.verwendete_applikationen;
    } else if (s.verwendete_applikationen_text) {
      apps = String(s.verwendete_applikationen_text)
        .split('\n')
        .map(x => x.trim())
        .filter(Boolean);
    }

    for (const a of apps) {
      await client.query(
        `INSERT INTO onboarding_software_apps (software_id, name)
         VALUES ($1,$2)`,
        [softwareId, (typeof a === 'string' ? a : (a?.name ?? null))]
      );
    }
  }
}

    // Mail: UPDATE oder INSERT
    if (mail) {
      const m = mail;
      const upd = await client.query(
        `UPDATE onboarding_mail
            SET anbieter=$1, anzahl_postfach=$2, anzahl_shared=$3, gesamt_speicher=$4,
                pop3_connector=$5, mobiler_zugriff=$6, informationen=$7, updated_at=NOW()
          WHERE onboarding_id=$8`,
        [
          m.anbieter ?? null, toNumberOrNull(m.anzahl_postfach), toNumberOrNull(m.anzahl_shared),
          toNumberOrNull(m.gesamt_speicher), toBool(m.pop3_connector), toBool(m.mobiler_zugriff),
          m.informationen ?? null, id
        ]
      );
      if (upd.rowCount === 0) {
        await client.query(
          `INSERT INTO onboarding_mail
             (onboarding_id, anbieter, anzahl_postfach, anzahl_shared, gesamt_speicher,
              pop3_connector, mobiler_zugriff, informationen)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            id, m.anbieter ?? null, toNumberOrNull(m.anzahl_postfach), toNumberOrNull(m.anzahl_shared),
            toNumberOrNull(m.gesamt_speicher), toBool(m.pop3_connector), toBool(m.mobiler_zugriff),
            m.informationen ?? null
          ]
        );
      }
    }

    // Backup: UPDATE oder INSERT
    if (backup) {
      const b = backup;
      const upd = await client.query(
        `UPDATE onboarding_backup
            SET tool=$1, interval=$2, retention=$3, location=$4, size=$5, info=$6, updated_at=NOW()
          WHERE onboarding_id=$7`,
        [b.tool ?? null, b.interval ?? null, b.retention ?? null, b.location ?? null, toNumberOrNull(b.size), b.info ?? null, id]
      );
      if (upd.rowCount === 0) {
        await client.query(
          `INSERT INTO onboarding_backup
             (onboarding_id, tool, interval, retention, location, size, info)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [id, b.tool ?? null, b.interval ?? null, b.retention ?? null, b.location ?? null, toNumberOrNull(b.size), b.info ?? null]
        );
      }
    }

    // Sonstiges: UPDATE oder INSERT
    if (sonstiges) {
      const upd = await client.query(
        'UPDATE onboarding_sonstiges SET text=$1, updated_at=NOW() WHERE onboarding_id=$2',
        [sonstiges.text || '', id]
      );
      if (upd.rowCount === 0) {
        await client.query(
          'INSERT INTO onboarding_sonstiges (onboarding_id, text) VALUES ($1,$2)',
          [id, sonstiges.text || '']
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Onboarding aktualisiert', onboarding_id: id });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('PATCH /api/onboarding/:id error:', e);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Onboardings' });
  } finally {
    client.release();
  }
});

// Nur Status ändern
app.patch('/api/onboarding/:id(\\d+)/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    const allowed = ['neu', 'in Arbeit', 'erledigt', 'offen'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Ungültiger Status' });
    const { rowCount } = await pool.query(
      `UPDATE onboarding SET status=$1, updated_at=NOW() WHERE onboarding_id=$2`,
      [status, id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Onboarding nicht gefunden' });
    res.json({ message: 'Status aktualisiert' });
  } catch (e) {
    console.error('PATCH /api/onboarding/:id/status error:', e);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Status' });
  }
});

// ======================= STATS (für Dashboard) =======================
app.get('/api/kalkulationen/stats', async (_req, res) => {
  try {
    const [kundenQ, projekteQ, stundenQ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS cnt FROM customers`),
      pool.query(`SELECT COUNT(*)::int AS cnt FROM onboarding`), // Projekte = Onboardings
      pool.query(`SELECT COALESCE(SUM(gesamtzeit),0)::float8 AS total_hours FROM kalkulationen`)
    ]);
    res.json({
      activeCustomers: Number(kundenQ.rows[0].cnt || 0),
      runningProjects: Number(projekteQ.rows[0].cnt || 0),
      totalHours: Number(stundenQ.rows[0].total_hours || 0),
    });
  } catch (e) {
    console.error('GET /api/kalkulationen/stats error:', e);
    res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
  }
});

// Neue Kalkulation anlegen (Header + Positionen) und per Trigger neu berechnen
app.post('/api/kalkulationen', async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    // akzeptiere beide Feldnamen (Frontend sendet aktuell kunde_id)
    const kundenId = Number(body.kunden_id ?? body.kunde_id);
    if (!kundenId) return res.status(400).json({ error: 'kunden_id/kunde_id ist erforderlich' });

    const stdsatz = body.stundensatz == null ? 0 : Number(body.stundensatz) || 0;
    const mwst = body.mwst == null ? (body.mwst_prozent == null ? 19 : Number(body.mwst_prozent) || 0) : Number(body.mwst) || 0;

    const positionen = Array.isArray(body.dienstleistungen) ? body.dienstleistungen : [];

    await client.query('BEGIN');

    const { rows: [krow] } = await client.query(
      `INSERT INTO kalkulationen (kunden_id, stundensatz, mwst_prozent)
       VALUES ($1,$2,$3) RETURNING kalkulations_id, datum`,
      [kundenId, stdsatz, mwst]
    );
    const kalkId = krow.kalkulations_id;

    for (const p of positionen) {
      await client.query(
        `INSERT INTO kalkulation_positionen
           (kalkulations_id, section, beschreibung, anzahl, dauer_pro_einheit, stundensatz, info)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          kalkId,
          p.section ?? null,
          p.beschreibung ?? '',
          Number(p.anzahl) || 0,
          Number(p.dauer_pro_einheit) || 0,
          p.stundensatz == null ? null : (Number(p.stundensatz) || 0),
          p.info ?? null
        ]
      );
    }

    // Trigger rechnen automatisch neu
    await client.query('COMMIT');

    // optional: Details zurückgeben
    const { rows: hdr } = await client.query(
      `SELECT k.*, c.firmenname FROM kalkulationen k
         JOIN customers c ON c.kunden_id = k.kunden_id
        WHERE k.kalkulations_id = $1`, [kalkId]
    );
    res.status(201).json({ message: 'Kalkulation gespeichert', kalkulation: hdr[0], kalkulations_id: kalkId });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('POST /api/kalkulationen error:', e);
    res.status(500).json({ error: 'Fehler beim Anlegen der Kalkulation' });
  } finally {
    client.release();
  }
});

// ======================= 404 =======================
app.use((req, res) => {
  res.status(404).json({ error: `Route nicht gefunden: ${req.originalUrl}` });
});

// ======================= START =======================
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
